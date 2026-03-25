from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import threading
import time
import json
import pika
import sys

app = Flask(__name__)
CORS(app)

# Configuration
INVENTORY_SERVICE_URL = os.environ.get("INVENTORY_SERVICE_URL", "http://inventory-ms:5001/api/v1/inventory")
PAYMENT_SERVICE_URL = os.environ.get("PAYMENT_SERVICE_URL", "http://payment-ms:5003/api/v1/payments/charge")
ORDER_SERVICE_URL = os.environ.get("ORDER_SERVICE_URL", "http://order-ms:5002/api/v1/orders")
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

# In-memory tracking for demo (Redis would be better for production)
active_sessions = {}

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

def checkout_timeout_worker(session_id, item_id, quantity, item_name):
    """Wait 1 minute and release stock if not confirmed."""
    time.sleep(60)
    if session_id in active_sessions and active_sessions[session_id]['status'] == 'pending':
        print(f"[CHECKOUT] 🕒 Session {session_id} timed out. Releasing stock.")
        try:
            # OUTSYSTEMS FIX: Redundant passing to avoid parsing errors
            release_url = f"{INVENTORY_SERVICE_URL}/release?ItemId={item_id}&Quantity={int(quantity)}&RequestedQuantity={int(quantity)}"
            requests.post(release_url, json={"Quantity": int(quantity), "RequestedQuantity": int(quantity)}, timeout=5)
            
            # 2. Broadcast Re-availability to Alert MS
            publish_event('alert.send', {
                "phone": "+6598261606", # Demo recipient
                "message": f"ChompChomp: {item_name} is available again! Grab it now!"
            })
            
            active_sessions[session_id]['status'] = 'timed_out'
        except Exception as e:
            print(f"Error during timeout cleanup: {e}")

@app.route('/api/v1/checkout/reserve', methods=['POST'])
def reserve():
    """Composite endpoint to start the checkout process."""
    data = request.json
    item_id = data.get('itemID')
    quantity = data.get('quantity', 1)
    user_id = data.get('userID')
    item_name = data.get('itemName', 'A food box')
    
    try:
        # OUTSYSTEMS FIX: When there is only ONE input parameter in the body and it's a basic type (Integer),
        # OutSystems expects the RAW value in the body, NOT a JSON object.
        reserve_url = f"{INVENTORY_SERVICE_URL}/reserve?ItemId={item_id}"
        
        # Send just the integer '1', not '{"Quantity": 1}'
        payload = int(quantity)
        
        import sys
        print(f"[DEBUG] REQUEST (RAW INT): POST {reserve_url} BODY: {payload}", file=sys.stderr)
        
        # We specify headers explicitly just to be safe, but json=payload also sets application/json
        resp = requests.post(reserve_url, json=payload, timeout=5)
        
        if resp.status_code == 200:
            session_id = f"sess_{int(time.time())}_{item_id}"
            active_sessions[session_id] = {
                "status": "pending",
                "itemID": item_id,
                "quantity": quantity,
                "userID": user_id,
                "merchantID": data.get('merchantID'),
                "merchant_name": data.get('merchant_name'), # Capture name
                "itemName": item_name
            }
            
            # 2. Start Timeout Orchestration (Phase 3 logic)
            threading.Thread(target=checkout_timeout_worker, args=(session_id, item_id, quantity, item_name), daemon=True).start()
            
            return jsonify({
                "sessionID": session_id,
                "message": "Stock reserved",
                "expires_in": 60
            }), 200
            
        # Handle non-JSON or error responses gracefully
        print(f"[DEBUG] OutSystems returned {resp.status_code}: {resp.text}", file=sys.stderr)
        try:
            error_data = resp.json()
        except:
            error_data = {"error": f"Atomic service returned {resp.status_code}", "details": resp.text}
        return jsonify(error_data), resp.status_code
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/checkout/pay', methods=['POST'])
def process_payment():
    """Composite endpoint to handle payment and finalization."""
    data = request.json
    session_id = data.get('sessionID')
    
    if session_id not in active_sessions:
        return jsonify({"error": "Invalid or expired session"}), 404
        
    session = active_sessions[session_id]
    if session['status'] != 'pending':
        return jsonify({"error": f"Session is already {session['status']}"}), 400
        
    try:
        # 1. Call Atomic Payment MS
        payment_payload = {
            "amount": data.get('amount'),
            "currency": "sgd",
            "token": data.get('token', 'tok_visa'),
            "metadata": {"sessionID": session_id}
        }
        pay_resp = requests.post(PAYMENT_SERVICE_URL, json=payment_payload, timeout=10)
        
        if pay_resp.status_code == 200:
            # 2. Finalize Session
            active_sessions[session_id]['status'] = 'paid'
            
            # 3. Persist Order History (Atomic Persistence)
            persistent_order_id = 0
            try:
                order_payload = {
                    "customerID": session['userID'],
                    "merchantID": session.get('merchantID') or "MOCK_MERCHANT",
                    "merchant_name": session.get('merchant_name') or "A Good Samaritan",
                    "itemID": session['itemID'],
                    "quantity": session['quantity'],
                    "price": data.get('amount'),
                    "total_paid": data.get('amount'),
                    "paymentID": pay_resp.json().get('paymentID'),
                    "status": "paid"
                }
                order_resp = requests.post(ORDER_SERVICE_URL, json=order_payload, timeout=5)
                if order_resp.status_code == 201:
                    persistent_order_id = order_resp.json().get('orderID', 0)
            except Exception as e:
                print(f"FAILED TO PERSIST ORDER HISTORY: {e}")

            # 4. Notify User via Alert MS
            publish_event('alert.send', {
                "phone": "+6598261606",
                "message": f"ChompChomp: Payment successful for {session['itemName']}! Thank you for rescuing food."
            })
            
            return jsonify({"message": "Payment successful", "orderID": persistent_order_id}), 200
            
        return jsonify(pay_resp.json()), pay_resp.status_code
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5011))
    app.run(host='0.0.0.0', port=port)
