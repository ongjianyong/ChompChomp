from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker
import pika
import os
import sys
import json
import math
import requests
import threading
import time

app = Flask(__name__)

# Database Configuration
DB_URL = os.environ.get("DATABASE_URL", "postgresql://inventory_user:inventory_pass@chomp-postgres:5432/inventory_db")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# RabbitMQ Configuration
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")
USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://user-ms:5006/api/v1/users")

class Item(Base):
    __tablename__ = "items"
    itemID = Column(Integer, primary_key=True, index=True)
    merchantID = Column(String, index=True)
    merchant_name = Column(String)  # Added to store the actual store name
    name = Column(String)
    price = Column(Float)
    original_price = Column(Float)
    quantity = Column(Integer)
    status = Column(String, default="available")
    lat = Column(Float, nullable=True)
    long = Column(Float, nullable=True)

Base.metadata.create_all(bind=engine)

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

def get_merchant_location(merchant_id):
    """Helper to fetch merchant location from user_ms."""
    try:
        resp = requests.get(f"{USER_SERVICE_URL}/{merchant_id}", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            return data.get('lat'), data.get('long')
    except Exception as e:
        print(f"Error fetching merchant location: {e}")
    return None, None

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    # Radius of earth in kilometers
    R = 6371.0
    
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@app.route('/api/v1/inventory', methods=['POST'])
def create_item():
    db = SessionLocal()
    try:
        data = request.json
        new_item = Item(
            merchantID=data.get('merchantID'),
            merchant_name=data.get('merchant_name', f'Merchant #{data.get("merchantID")}'),
            name=data.get('name'),
            price=data.get('price'),
            original_price=data.get('original_price'),
            quantity=data.get('quantity'),
            status="available"
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)

        # Get merchant location for initial storage
        lat, long = get_merchant_location(new_item.merchantID)
        new_item.lat = lat
        new_item.long = long
        db.commit()

        # Broadcast the event for Notifications MS
        publish_event('box.listed', {
            "itemID": new_item.itemID,
            "merchantID": new_item.merchantID,
            "name": new_item.name,
            "price": new_item.price
        })

        return jsonify({"message": "Item created successfully", "itemID": new_item.itemID}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/v1/inventory', methods=['GET'])
def get_items():
    db = SessionLocal()
    try:
        user_lat = request.args.get('lat', type=float)
        user_long = request.args.get('long', type=float)
        max_dist = request.args.get('max_dist', type=float)
        
        items = db.query(Item).filter(Item.status == 'available').all()
        result = []
        for item in items:
            dist = None
            if user_lat is not None and user_long is not None and item.lat is not None and item.long is not None:
                dist = haversine(user_lat, user_long, item.lat, item.long)
            
            # Filter by distance if max_dist is provided
            if max_dist is not None:
                if dist is None or dist > max_dist:
                    continue

            result.append({
                "itemID": item.itemID,
                "merchantID": item.merchantID,
                "merchant_name": item.merchant_name or f"Merchant #{item.merchantID}",
                "name": item.name,
                "price": item.price,
                "original_price": item.original_price,
                "quantity": item.quantity,
                "status": item.status,
                "distance": round(dist, 2) if dist is not None else None
            })
        
        # Sort by distance if calculated
        if user_lat is not None and user_long is not None:
            result.sort(key=lambda x: (x['distance'] is None, x['distance']))
            
        return jsonify(result), 200
    finally:
        db.close()

@app.route('/api/v1/inventory/<int:item_id>/reserve', methods=['POST'])
def reserve_item(item_id):
    db = SessionLocal()
    try:
        data = request.json
        qty = data.get('quantity', 1)
        
        # Atomic lock on the row to prevent race conditions
        item = db.query(Item).filter(Item.itemID == item_id).with_for_update().first()
        if not item:
            return jsonify({"error": "Item not found"}), 404
        
        if item.quantity < qty:
            return jsonify({"error": "Insufficient stock"}), 400
        
        item.quantity -= qty
        if item.quantity == 0:
            item.status = "sold_out"
            
        db.commit()
        return jsonify({"message": f"Reserved {qty} units", "remaining": item.quantity}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/v1/inventory/<int:item_id>/release', methods=['POST'])
def release_item(item_id):
    db = SessionLocal()
    try:
        data = request.json
        qty = data.get('quantity', 1)
        
        print(f"RELEASE [DEBUG]: Request to release {qty} units for item {item_id}")
        item = db.query(Item).filter(Item.itemID == item_id).with_for_update().first()
        if not item:
            print(f"RELEASE [ERROR]: Item {item_id} not found")
            db.close()
            return jsonify({"error": "Item not found"}), 404
        
        old_val = item.quantity
        item.quantity += qty
        item.status = "available"
            
        db.commit()
        print(f"RELEASE [SUCCESS]: Item {item_id} quantity updated: {old_val} -> {item.quantity}")
        db.close()
        return jsonify({
            "message": f"Released {qty} units", 
            "item_id": item_id,
            "old_quantity": old_val,
            "new_quantity": item.quantity
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/v1/inventory/<int:item_id>/confirm', methods=['POST'])
def confirm_item_sale(item_id):
    # For now, confirmation is just a logging step as we decrement on reservation
    # to guarantee availability to the person with the lock.
    return jsonify({"message": "Sale confirmed"}), 200

@app.route('/api/v1/inventory/merchant/<merchant_id>', methods=['GET'])
def get_merchant_items(merchant_id):
    db = SessionLocal()
    try:
        items = db.query(Item).filter(Item.merchantID == merchant_id).all()
        result = [
            {
                "itemID": item.itemID,
                "merchantID": item.merchantID,
                "merchant_name": item.merchant_name or f"Merchant #{item.merchantID}",
                "name": item.name,
                "price": item.price,
                "original_price": item.original_price,
                "quantity": item.quantity,
                "status": item.status
            } for item in items
        ]
        return jsonify(result), 200
    finally:
        db.close()

@app.route('/api/v1/inventory/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    db = SessionLocal()
    try:
        data = request.json
        item = db.query(Item).filter(Item.itemID == item_id).first()
        if not item:
            return jsonify({"error": "Item not found"}), 404
        
        # Update fields if provided
        if 'name' in data:
            item.name = data['name']
        if 'description' in data:
            item.description = data['description']
        if 'price' in data:
            item.price = float(data['price'])
        if 'original_price' in data:
            item.original_price = float(data['original_price'])
        if 'quantity' in data:
            item.quantity = int(data['quantity'])
            if item.quantity > 0 and item.status == 'sold_out':
                item.status = 'available'
            elif item.quantity == 0:
                item.status = 'sold_out'

        db.commit()
        return jsonify({"message": "Item updated successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/v1/inventory/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    db = SessionLocal()
    try:
        item = db.query(Item).filter(Item.itemID == item_id).first()
        if not item:
            return jsonify({"error": "Item not found"}), 404
        
        db.delete(item)
        db.commit()
        return jsonify({"message": "Item deleted successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

def consume_user_events():
    """Background consumer to update merchant locations when they change."""
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
            channel = connection.channel()
            channel.exchange_declare(exchange='chomp_events', exchange_type='topic')
            
            result = channel.queue_declare(queue='', exclusive=True)
            queue_name = result.method.queue
            channel.queue_bind(exchange='chomp_events', queue=queue_name, routing_key='user.location_updated')
            
            def callback(ch, method, properties, body):
                data = json.loads(body)
                if data.get('role') == 'merchant':
                    merchant_id = data.get('userID')
                    new_lat = data.get('lat')
                    new_long = data.get('long')
                    
                    db = SessionLocal()
                    try:
                        # Update all items belonging to this merchant
                        items = db.query(Item).filter(Item.merchantID == merchant_id).all()
                        for item in items:
                            item.lat = new_lat
                            item.long = new_long
                        db.commit()
                        print(f"[INVENTORY MS] Updated location for merchant {merchant_id}")
                    except Exception as e:
                        print(f"Error updating merchant location: {e}", file=sys.stderr)
                    finally:
                        db.close()
                ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_consume(queue=queue_name, on_message_callback=callback)
            print("Inventory MS consumer waiting for user location events...", file=sys.stderr)
            channel.start_consuming()
        except Exception as e:
            print(f"Inventory consumer failed: {e}. Retrying in 5s...", file=sys.stderr)
            time.sleep(5)

# Start background thread
threading.Thread(target=consume_user_events, daemon=True).start()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port)
