from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker
import redis
import requests
import pika
import os
import json
import traceback
import threading
import time

app = Flask(__name__)

# Database Configuration
DB_URL = os.environ.get("DATABASE_URL", "postgresql://order_user:order_pass@chomp-postgres:5432/order_db")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Redis Configuration for Distributed Locking (BTL Requirement)
REDIS_HOST = os.environ.get("REDIS_HOST", "chomp-redis")
redis_client = redis.Redis(host=REDIS_HOST, port=6379, db=0, decode_responses=True)

class Order(Base):
    __tablename__ = "orders"
    orderID = Column(Integer, primary_key=True, index=True)
    customerID = Column(String, index=True)
    merchantID = Column(String, index=True)
    itemID = Column(Integer)
    
    # Pricing fields
    item_price = Column(Float)
    delivery_fee = Column(Float, default=0.0)
    total_paid = Column(Float) # item_price + delivery_fee
    
    # Commission split
    merchant_amount = Column(Float) # 90% of item_price
    platform_fee = Column(Float)    # 10% of item_price
    
    # Status & Delivery
    status = Column(String, default="pending") # reserved, paid, courier_searching, dispatched, completed, cancelled
    delivery_type = Column(String) # 'pickup' or 'delivery'
    paymentID = Column(String, nullable=True)
    quantity = Column(Integer, default=1)

Base.metadata.create_all(bind=engine)

# RabbitMQ Configuration
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

def publish_event(event_type, payload):
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        channel.exchange_declare(exchange='chomp_events', exchange_type='topic')
        channel.basic_publish(
            exchange='chomp_events',
            routing_key=event_type,
            body=json.dumps(payload)
        )
        connection.close()
    except Exception as e:
        print(f"Failed to publish event: {e}")
        traceback.print_exc()

@app.route('/api/v1/orders', methods=['POST'])
def create_order():
    data = request.json
    print(f"DEBUG: Received order request: {data}")
    
    item_id = data.get('itemID')
    customer_id = data.get('customerID') or data.get('customer_id')
    quantity = data.get('quantity', 1)
    # Standardized to 1 minute (60s)
    expires_in = 60
    
    if not item_id or not customer_id:
        return jsonify({
            "error": "itemID and customerID are required",
            "received": data
        }), 400
    
    # BTL Requirement: Redis Distributed Lock implementation (SETNX-like)
    lock_key = f"lock:item:{item_id}"
    
    # Check if we already own the lock (idempotent retry)
    existing_lock_owner = redis_client.get(lock_key)
    if existing_lock_owner == str(customer_id):
        print(f"DEBUG: Customer {customer_id} already owns lock for item {item_id}. Refreshing for {expires_in}s.")
        redis_client.expire(lock_key, expires_in)
        lock_acquired = True
    else:
        print(f"DEBUG: Attempting to acquire lock for item {item_id} by customer {customer_id} for {expires_in}s")
        lock_acquired = redis_client.set(lock_key, str(customer_id), ex=expires_in, nx=True)
    
    if not lock_acquired:
        return jsonify({
            "error": "Item is currently locked by another user. Please try again in 5 minutes if they do not complete the purchase."
        }), 409
        
    db = SessionLocal()
    try:
        # Proceed with orchestrating the order creation transaction
        item_price = data.get('price', 0.0)
        delivery_type = data.get('deliveryType', 'pickup')
        delivery_fee = 5.0 if delivery_type == 'delivery' else 0.0
        
        # Commission Split Logic
        platform_commission_rate = 0.10
        platform_fee = round(item_price * platform_commission_rate, 2)
        merchant_amount = round(item_price * (1 - platform_commission_rate), 2)
        total_paid = item_price + delivery_fee

        new_order = Order(
            customerID=customer_id,
            merchantID=data.get('merchantID'),
            itemID=item_id,
            quantity=quantity,
            item_price=item_price,
            delivery_fee=delivery_fee,
            total_paid=total_paid,
            merchant_amount=merchant_amount,
            platform_fee=platform_fee,
            delivery_type=delivery_type,
            status="reserved"
        )
        db.add(new_order)
        db.commit()
        db.refresh(new_order)

        # 1. Call Inventory MS to reserve stock
        INVENTORY_URL = os.environ.get("INVENTORY_URL", "http://inventory-ms:5001")
        try:
            res = requests.post(f"{INVENTORY_URL}/api/v1/inventory/{item_id}/reserve", json={"quantity": quantity}, timeout=5)
            if res.status_code != 200:
                db.delete(new_order)
                db.commit()
                return jsonify({"error": "Failed to reserve stock", "details": res.json()}), res.status_code
        except Exception as e:
            db.delete(new_order)
            db.commit()
            return jsonify({"error": f"Inventory service unavailable: {str(e)}"}), 503

        # 2. Set Redis reservation timer
        reservation_key = f"resv:{new_order.orderID}"
        redis_client.set(reservation_key, "active", ex=expires_in)
        
        return jsonify({
            "message": f"Order reserved successfully. You have {expires_in} seconds to complete the payment.",
            "orderID": new_order.orderID,
            "total_paid": total_paid,
            "status": "reserved",
            "expires_in": expires_in,
            "quantity": quantity,
            "deliveryType": delivery_type
        }), 201

    except Exception as e:
        traceback.print_exc()
        db.rollback()
        # If order fails, release the lock immediately if we're certain it's a hard failure
        # For now, we'll keep it for safety.
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/v1/orders/<int:order_id>/pay', methods=['POST'])
def confirm_payment(order_id):
    print(f"DIAGNOSTIC: Starting confirm_payment for order {order_id}")
    db = SessionLocal()
    try:
        print("DIAGNOSTIC: Fetching order from DB")
        order = db.query(Order).get(order_id)
        if not order:
            print("DIAGNOSTIC: Order not found")
            return jsonify({"error": "Order not found"}), 404
        
        print(f"DIAGNOSTIC: Order status is {order.status}")
        if order.status != 'reserved':
            return jsonify({"error": f"Order in status {order.status} cannot be paid"}), 400

        # Check Redis reservation timer
        reservation_key = f"resv:{order_id}"
        if not redis_client.exists(reservation_key):
            print(f"DIAGNOSTIC: Reservation for order {order_id} has expired")
            # Auto-release stock if expired
            INVENTORY_URL = os.environ.get("INVENTORY_URL", "http://inventory-ms:5001")
            try:
                # Fetch item details first to get the name
                item_resp = requests.get(f"{INVENTORY_URL}/api/v1/inventory", timeout=5)
                item_name = "An item"
                if item_resp.ok:
                    items_list = item_resp.json()
                    item_data = next((i for i in items_list if i['itemID'] == order.itemID), None)
                    if item_data:
                        item_name = item_data['name']

                requests.post(f"{INVENTORY_URL}/api/v1/inventory/{order.itemID}/release", json={"quantity": order.quantity})
                
                # Broadcast re-availability
                publish_event('box.available_again', {
                    "itemID": order.itemID,
                    "name": item_name,
                    "merchantID": order.merchantID
                })
            except Exception as ex:
                print(f"DIAGNOSTIC: Error releasing stock/notifying: {ex}")

            order.status = 'cancelled'
            db.commit()
            return jsonify({"error": "Reservation expired. Stock has been released."}), 410

        data = request.json or {}
        print(f"DIAGNOSTIC: Request data: {data}")
        
        # In a real app, we'd verify the Stripe payment ID here
        order.paymentID = data.get('paymentID', 'pi_manual_override')
        
        if order.delivery_type == 'delivery':
            print("DIAGNOSTIC: Setting status to searching")
            order.status = 'searching'
            # Trigger Logistics via RabbitMQ
            print("DIAGNOSTIC: Publishing order.paid event")
            publish_event('order.paid', {
                "orderID": order.orderID,
                "customerID": order.customerID,
                "merchantID": order.merchantID,
                "delivery_type": order.delivery_type
            })
        else:
            print("DIAGNOSTIC: Setting status to paid (pickup)")
            order.status = 'paid' # Ready for pickup
            
        # Clean up Redis reservation key
        redis_client.delete(reservation_key)
        
        print("DIAGNOSTIC: Committing to DB")
        db.commit()
        print("DIAGNOSTIC: Success!")
        return jsonify({
            "message": "Payment confirmed",
            "orderID": order.orderID,
            "status": order.status
        }), 200
    except Exception as e:
        print("DIAGNOSTIC: FAILURE OCCURRED")
        traceback.print_exc()
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/v1/orders/<int:order_id>/switch-pickup', methods=['POST'])
def switch_to_pickup(order_id):
    db = SessionLocal()
    try:
        order = db.query(Order).get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
        
        # Can switch if searching or if courier search failed
        if order.status not in ['searching', 'courier_searching', 'failed']:
            return jsonify({"error": f"Cannot switch to pickup from status {order.status}"}), 400

        order.status = 'ready_for_pickup'
        order.delivery_type = 'pickup'
        
        # Process $5 partial refund for delivery fee
        PAYMENT_URL = os.environ.get("PAYMENT_URL", "http://payment-ms:5003")
        if order.paymentID:
            try:
                resp = requests.post(f"{PAYMENT_URL}/api/v1/payments/refund", json={
                    "paymentID": order.paymentID,
                    "amount": 5.00
                }, timeout=5)
                print(f"SWITCH [DEBUG]: Refund status: {resp.status_code}, body: {resp.text}")
                if resp.status_code in [200, 201]:
                    print(f"SWITCH [SUCCESS] Processed partial $5 refund for order {order_id}")
                else:
                    print(f"SWITCH [FAILURE] Payment MS rejected refund for {order_id}: {resp.text}")
            except Exception as e:
                print(f"SWITCH [ERROR] Failed to hit payment_ms for partial refund: {e}")
        
        db.commit()
        publish_event('order.status_update', {
            "orderID": order.orderID,
            "status": order.status,
            "customerID": order.customerID
        })
        
        return jsonify({"message": "Switched to self-pickup", "status": order.status}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@app.route('/api/v1/orders/user/<string:customer_id>', methods=['GET'])
def get_user_orders(customer_id):
    db = SessionLocal()
    try:
        orders = db.query(Order).filter(Order.customerID == customer_id).order_by(Order.orderID.desc()).all()
        return jsonify([{
            "orderID": o.orderID,
            "customerID": o.customerID,
            "merchantID": o.merchantID,
            "itemID": o.itemID,
            "total_paid": o.total_paid,
            "status": o.status,
            "delivery_type": o.delivery_type,
            "quantity": o.quantity
        } for o in orders]), 200
    finally:
        db.close()

@app.route('/api/v1/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    db = SessionLocal()
    try:
        order = db.query(Order).get(order_id)
        if order:
            return jsonify({
                "orderID": order.orderID,
                "customerID": order.customerID,
                "merchantID": order.merchantID,
                "itemID": order.itemID,
                "total_paid": order.total_paid,
                "status": order.status,
                "delivery_type": order.delivery_type,
                "paymentID": order.paymentID,
                "quantity": order.quantity
            }), 200
        return jsonify({"error": "Order not found"}), 404
    finally:
        db.close()

def consume_events():
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        channel.exchange_declare(exchange='chomp_events', exchange_type='topic')
        
        result = channel.queue_declare(queue='', exclusive=True)
        queue_name = result.method.queue
        
        channel.queue_bind(exchange='chomp_events', queue=queue_name, routing_key='order.dispatched')
        channel.queue_bind(exchange='chomp_events', queue=queue_name, routing_key='courier.not_found')
        channel.queue_bind(exchange='chomp_events', queue=queue_name, routing_key='order.status_update')
        
        def callback(ch, method, properties, body):
            data = json.loads(body)
            order_id = data.get('orderID')
            routing_key = method.routing_key
            
            db = SessionLocal()
            try:
                order = db.query(Order).get(order_id)
                if order:
                    if routing_key == 'order.dispatched':
                        order.status = 'dispatched'
                    elif routing_key == 'courier.not_found':
                        order.status = 'failed'
                    elif routing_key == 'order.status_update':
                        order.status = data.get('status')
                    
                    db.commit()
                    print(f"[ORDER MS] Updated Order {order_id} to status: {order.status}")
            except Exception as e:
                print(f"Error updating order status from event: {e}")
            finally:
                db.close()
            ch.basic_ack(delivery_tag=method.delivery_tag)

        channel.basic_consume(queue=queue_name, on_message_callback=callback)
        print("Order MS consumer started. Waiting for logistics events...")
        channel.start_consuming()
    except Exception as e:
        print(f"Order MS consumer failed: {e}")

@app.route('/api/v1/orders/<int:order_id>/cancel', methods=['POST'])
def cancel_order(order_id):
    db = SessionLocal()
    try:
        order = db.query(Order).get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
        
        if order.status not in ['reserved', 'searching', 'courier_searching', 'failed']:
            return jsonify({"error": f"Cannot cancel order in status {order.status}"}), 400

        # Release stock in Inventory MS
        INVENTORY_URL = os.environ.get("INVENTORY_URL", "http://inventory-ms:5001")
        print(f"CANCEL [DEBUG]: Explicit cancel request for order {order_id}. Target item: {order.itemID}, qty: {order.quantity}")
        
        try:
            resp = requests.post(f"{INVENTORY_URL}/api/v1/inventory/{order.itemID}/release", json={"quantity": order.quantity}, timeout=5)
            print(f"CANCEL [DEBUG]: Inventory response: {resp.status_code} {resp.text}")
            
            if resp.status_code not in [200, 201]:
                return jsonify({"error": f"Inventory release failing: {resp.text}"}), resp.status_code

            # Remove from Redis
            redis_client.delete(f"resv:{order_id}")
            redis_client.delete(f"lock:item:{order.itemID}")

            # Process full refund
            PAYMENT_URL = os.environ.get("PAYMENT_URL", "http://payment-ms:5003")
            if order.paymentID:
                try:
                    resp = requests.post(f"{PAYMENT_URL}/api/v1/payments/refund", json={
                        "paymentID": order.paymentID
                    }, timeout=5)
                    print(f"CANCEL [DEBUG]: Refund status: {resp.status_code}, body: {resp.text}")
                    if resp.status_code in [200, 201]:
                        print(f"CANCEL [SUCCESS] Processed full refund for order {order_id}")
                    else:
                        print(f"CANCEL [FAILURE] Payment MS rejected refund for {order_id}: {resp.text}")
                except Exception as e:
                    print(f"CANCEL [ERROR] Failed to hit payment_ms for full refund: {e}")

            order.status = 'cancelled'
            db.commit()
            
            # Broadcast cancellation event for other microservices
            publish_event('order.cancelled', {
                "orderID": order.orderID,
                "customerID": order.customerID,
                "paymentID": order.paymentID
            })

            print(f"CANCEL [SUCCESS]: Order {order_id} cancelled and stock released.")
            return jsonify({"message": "Order cancelled and stock released"}), 200
        except Exception as e:
            print(f"CANCEL [ERROR] communication failure: {e}")
            return jsonify({"error": f"Failed to reach inventory service: {str(e)}"}), 503
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

def cleanup_expired_reservations():
    """Background worker to reap expired reservations from DB if Redis key is gone."""
    while True:
        try:
            db = SessionLocal()
            # Find orders that are 'reserved' but their Redis key is missing
            reserved_orders = db.query(Order).filter(Order.status == 'reserved').all()
            for order in reserved_orders:
                resv_key = f"resv:{order.orderID}"
                if not redis_client.exists(resv_key):
                    print(f"CLEANUP [DEBUG]: Redis key {resv_key} is missing for Order {order.orderID}. Releasing stock.")
                    try:
                        INVENTORY_URL = os.environ.get("INVENTORY_URL", "http://inventory-ms:5001")
                        print(f"CLEANUP [DEBUG]: Calling {INVENTORY_URL}/api/v1/inventory/{order.itemID}/release with qty {order.quantity}")
                        resp = requests.post(f"{INVENTORY_URL}/api/v1/inventory/{order.itemID}/release", json={"quantity": order.quantity}, timeout=5)
                        print(f"CLEANUP [DEBUG]: Inventory response: {resp.status_code} {resp.text}")
                        
                        if resp.status_code in [200, 201]:
                            # Fetch item name for notification
                            item_name = "An item"
                            try:
                                item_resp = requests.get(f"{INVENTORY_URL}/api/v1/inventory", timeout=5)
                                if item_resp.ok:
                                    items_list = item_resp.json()
                                    item_data = next((i for i in items_list if i['itemID'] == order.itemID), None)
                                    if item_data:
                                        item_name = item_data['name']
                            except: pass

                            order.status = 'cancelled'
                            redis_client.delete(f"lock:item:{order.itemID}")
                            
                            # Broadcast re-availability
                            publish_event('box.available_again', {
                                "itemID": order.itemID,
                                "name": item_name,
                                "merchantID": order.merchantID
                            })
                            
                            print(f"CLEANUP [SUCCESS]: Order {order.orderID} reaped and notification sent.")
                        else:
                            print(f"CLEANUP [FAILURE]: Inventory service rejected release for {order.orderID}: {resp.text}")
                    except Exception as re:
                        print(f"CLEANUP [ERROR] for {order.orderID}: {re}")
            db.commit()
            db.close()
        except Exception as e:
            print(f"CLEANUP OUTER ERROR: {e}")
        time.sleep(60)

# Start background threads at top level so they run under Gunicorn
threading.Thread(target=consume_events, daemon=True).start()
threading.Thread(target=cleanup_expired_reservations, daemon=True).start()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5002))
    app.run(host='0.0.0.0', port=port)
