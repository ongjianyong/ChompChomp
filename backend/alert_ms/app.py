import pika
import json
import os
import time
import requests
import threading
from flask import Flask, request, jsonify
from twilio.rest import Client

app = Flask(__name__)

# Configuration
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")
INVENTORY_SERVICE_URL = os.environ.get("INVENTORY_SERVICE_URL", "http://inventory-ms:5001/api/v1/inventory")

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER")
TWILIO_TRIAL_NUMBER = os.environ.get("TWILIO_TRIAL_DESTINATION_NUMBER", "+6598261606")


# ─────────────────────────────────────────
# Twilio SMS Helper
# ─────────────────────────────────────────

def send_real_sms(phone, message):
    """Send SMS via Twilio. Falls back to mock if credentials missing."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print(f"[ALERT-MS] ⚠️  Twilio credentials missing — mock mode.")
        print(f"[TWILIO MOCK] 📱 To {phone}: {message}")
        return True

    # Twilio trial accounts can only send to verified numbers
    if phone != TWILIO_TRIAL_NUMBER:
        print(f"[ALERT-MS] 🔀 Demo mode — skipping unverified number {phone}. Logging instead:")
        print(f"[TWILIO MOCK] 📱 To {phone}: {message}")
        return True

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        msg_obj = client.messages.create(
            body=message,
            from_=TWILIO_FROM_NUMBER,
            to=phone
        )
        print(f"[ALERT-MS] ✅ SMS sent. SID: {msg_obj.sid}")
        return True
    except Exception as e:
        print(f"[ALERT-MS] ❌ Twilio send failed: {e}")
        return False


# ─────────────────────────────────────────
# Queue Consumers
# ─────────────────────────────────────────

def process_premium(ch, method, properties, body):
    """
    Consume from Premium Queue.
    Premium users get notifications immediately — no availability check needed.
    The listing was just created seconds ago so it is guaranteed to be available.
    """
    try:
        data = json.loads(body)
        phone = data.get('phone')
        message = data.get('message')
        item_id = data.get('item_id')

        print(f"[ALERT-MS] 🔔 Premium notification for item {item_id} → {phone}")
        send_real_sms(phone, message)

    except Exception as e:
        print(f"[ALERT-MS] ❌ Error processing premium message: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


def process_free_dlq(ch, method, properties, body):
    """
    Consume from Free Dead Letter Queue.

    These messages arrived here after sitting in free_notification_queue for
    600,000ms (10 minutes). RabbitMQ routed them here automatically when TTL expired.

    Before calling Twilio, we check if the item is still available.
    If the item was sold during the 10-minute wait, we drop the notification silently.
    This check only applies to Free users because Premium users are notified immediately.
    """
    try:
        data = json.loads(body)
        phone = data.get('phone')
        message = data.get('message')
        item_id = data.get('item_id')

        print(f"[ALERT-MS] ⏰ Free notification (post-TTL) for item {item_id} → {phone}")

        # Availability check — drop notification if item sold during TTL wait
        try:
            resp = requests.get(
                f"{INVENTORY_SERVICE_URL}/{item_id}/quantity",
                timeout=5
            )
            if resp.status_code == 200:
                qty = resp.json().get('quantity', 0)
                if qty <= 0:
                    print(f"[ALERT-MS] 🚫 Item {item_id} is sold out. Dropping Free notification for {phone}.")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return
                print(f"[ALERT-MS] ✅ Item {item_id} still has {qty} units. Sending notification.")
            else:
                print(f"[ALERT-MS] ⚠️  Could not verify availability (status {resp.status_code}). Sending anyway.")
        except Exception as e:
            print(f"[ALERT-MS] ⚠️  Availability check failed: {e}. Sending anyway.")

        send_real_sms(phone, message)

    except Exception as e:
        print(f"[ALERT-MS] ❌ Error processing free DLQ message: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

def process_direct_alert(ch, method, properties, body):
    """
    Consume from Direct Alert Queue.
    Used for immediate, non-tiered system alerts (e.g., payment success, stock re-availability).
    """
    try:
        data = json.loads(body)
        phone = data.get('phone')
        message = data.get('message')
        
        print(f"[ALERT-MS] ✉️  Direct system alert → {phone}")
        send_real_sms(phone, message)
        
    except Exception as e:
        print(f"[ALERT-MS] ❌ Error processing direct alert: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


# ─────────────────────────────────────────
# RabbitMQ Background Consumer
# ─────────────────────────────────────────

def consume_background():
    """
    Connects to RabbitMQ and consumes from two queues:
    1. premium_notification_queue — immediate delivery
    2. free_notification_dlq     — after TTL expires from free_notification_queue

    Note: Alert MS does NOT consume from free_notification_queue directly.
    That queue is only used to hold messages until TTL expires.
    RabbitMQ then routes expired messages to free_notification_dlq automatically.
    """
    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=RABBITMQ_HOST)
            )
            channel = connection.channel()

            # Declare exchange
            channel.exchange_declare(
                exchange='chomp_events',
                exchange_type='topic',
                durable=True
            )

            # ── Premium Queue ──────────────────────────────────────
            channel.queue_declare(
                queue='premium_notification_queue',
                durable=True
            )
            channel.queue_bind(
                exchange='chomp_events',
                queue='premium_notification_queue',
                routing_key='notification.premium'
            )

            # ── Free Queue (TTL) ───────────────────────────────────
            # Declared here so Alert MS knows about it, but we do NOT consume from it.
            # Messages sit here for TTL then are routed to free_notification_dlq.
            channel.queue_declare(
                queue='free_notification_queue',
                durable=True,
                arguments={
                    'x-message-ttl': 60000,  # Must match FREE_QUEUE_TTL_MS in discovery_orchestrator
                    'x-dead-letter-exchange': 'chomp_events',
                    'x-dead-letter-routing-key': 'notification.free.dlq'
                }
            )
            channel.queue_bind(
                exchange='chomp_events',
                queue='free_notification_queue',
                routing_key='notification.free'
            )

            # ── Dead Letter Queue ──────────────────────────────────
            # Alert MS consumes from here — messages arrive after TTL expires.
            channel.queue_declare(
                queue='free_notification_dlq',
                durable=True
            )
            channel.queue_bind(
                exchange='chomp_events',
                queue='free_notification_dlq',
                routing_key='notification.free.dlq'
            )

            # ── Direct Alert Queue ─────────────────────────────────
            channel.queue_declare(
                queue='direct_alert_queue',
                durable=True
            )
            channel.queue_bind(
                exchange='chomp_events',
                queue='direct_alert_queue',
                routing_key='alert.send'
            )

            # Register consumers
            channel.basic_consume(
                queue='premium_notification_queue',
                on_message_callback=process_premium
            )
            channel.basic_consume(
                queue='free_notification_dlq',
                on_message_callback=process_free_dlq
            )
            channel.basic_consume(
                queue='direct_alert_queue',
                on_message_callback=process_direct_alert
            )

            print('[ALERT-MS] ✅ Listening on premium_notification_queue and free_notification_dlq...')
            channel.start_consuming()

        except Exception as e:
            print(f"[ALERT-MS] ❌ RabbitMQ connection failed: {e}. Retrying in 5s...")
            time.sleep(5)


# ─────────────────────────────────────────
# REST Endpoint (kept for direct HTTP alerts)
# ─────────────────────────────────────────

@app.route('/api/v1/alert', methods=['POST'])
def trigger_alert():
    """Generic REST endpoint to send an alert directly."""
    data = request.json
    phone = data.get('phone')
    message = data.get('message')

    if not phone or not message:
        return jsonify({"error": "Phone and message are required"}), 400

    success = send_real_sms(phone, message)
    if success:
        return jsonify({"message": "Alert sent"}), 200
    return jsonify({"error": "Failed to send alert"}), 500


# ─────────────────────────────────────────
# Startup
# ─────────────────────────────────────────

# Start RabbitMQ consumer in background thread
# This runs at module import time, which works for both 'python app.py' and 'gunicorn app:app'
_consumer_thread = threading.Thread(target=consume_background, daemon=True)
_consumer_thread.start()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5004))
    app.run(host='0.0.0.0', port=port)