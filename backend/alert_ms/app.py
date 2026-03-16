import pika
import json
import os
import time
from flask import Flask, request, jsonify
from twilio.rest import Client
import threading

app = Flask(__name__)

# Configuration
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER")

def send_real_sms(phone, message):
    """Generic helper to send SMS via Twilio or Mock."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print("[ALERT-MS] ⚠️ Twilio credentials missing. Falling back to mock.")
        print(f"[TWILIO MOCK] 📱 Sending SMS to {phone}: {message}")
        return True

    # Hardcoded demo number rule:
    if phone != "+6598261606":
        print(f"[ALERT-MS] 🔀 Demo mode active. Skipping SMS to unverified number: {phone}")
        return True

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        msg_obj = client.messages.create(
            body=message,
            from_=TWILIO_FROM_NUMBER,
            to=phone
        )
        print(f"[ALERT-MS] ✅ SMS sent successfully! SID: {msg_obj.sid}")
        return True
    except Exception as e:
        print(f"[ALERT-MS] ❌ Failed to send SMS via Twilio: {e}")
        return False

@app.route('/api/v1/alert', methods=['POST'])
def trigger_alert():
    """Generic REST endpoint to send an alert."""
    data = request.json
    phone = data.get('phone')
    message = data.get('message')
    
    if not phone or not message:
        return jsonify({"error": "Phone and message are required"}), 400
        
    success = send_real_sms(phone, message)
    if success:
        return jsonify({"message": "Alert sent"}), 200
    return jsonify({"error": "Failed to send alert"}), 500

def process_event(ch, method, properties, body):
    """Generic RabbitMQ consumer for alerts."""
    try:
        data = json.loads(body)
        phone = data.get('phone')
        message = data.get('message')
        
        if phone and message:
            print(f"[*] Processing alert for {phone}")
            send_real_sms(phone, message)
    except Exception as e:
        print(f"Error processing event: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

def consume_background():
    """Consumes generic alert events from RabbitMQ."""
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
            channel = connection.channel()
            channel.exchange_declare(exchange='chomp_events', exchange_type='topic')
            
            result = channel.queue_declare(queue='alert_queue', exclusive=False)
            queue_name = result.method.queue
            
            # Bind to a generic routing key
            channel.queue_bind(exchange='chomp_events', queue=queue_name, routing_key='alert.send')
            
            channel.basic_consume(queue=queue_name, on_message_callback=process_event)
            print(' [ALERT-MS] Waiting for generic alert events...')
            channel.start_consuming()
        except Exception as e:
            print(f"RabbitMQ Connection failed: {e}. Retrying in 5s...")
            time.sleep(5)

if __name__ == '__main__':
    # Start RabbitMQ consumer in a background thread
    threading.Thread(target=consume_background, daemon=True).start()
    
    # Start Flask API
    port = int(os.environ.get("PORT", 5004))
    app.run(host='0.0.0.0', port=port)
