import pika
import json
import os
import time
import requests
import threading
from flask import Flask, request, jsonify

app = Flask(__name__)

# Configuration
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")
INVENTORY_SERVICE_URL = os.environ.get("INVENTORY_SERVICE_URL", "http://inventory-ms:5001/api/v1/inventory")
ALERT_SERVICE_URL = os.environ.get("ALERT_SERVICE_URL", "http://alert-ms:5004/api/v1/alert")


def trigger_alert_wrapper(phone, message):
    """Call the Atomic Alert MS Wrapper."""
    try:
        resp = requests.post(
            ALERT_SERVICE_URL,
            json={"phone": phone, "message": message},
            timeout=5
        )
        if resp.status_code == 200:
            print(f"[NOTIF-ORCH] Alert MS call successful for {phone}")
            return True
        else:
            print(f"[NOTIF-ORCH] Alert MS call failed (status {resp.status_code})")
    except Exception as e:
        print(f"[NOTIF-ORCH] Error calling Alert MS: {e}")
    return False


def process_premium(ch, method, properties, body):
    """Premium users get notifications immediately."""
    try:
        data = json.loads(body)
        phone = data.get('phone')
        message = data.get('message')
        item_id = data.get('item_id')

        print(f"[NOTIF-ORCH] Premium event for item {item_id} -> {phone}")
        trigger_alert_wrapper(phone, message)

    except Exception as e:
        print(f"[NOTIF-ORCH] Error processing premium message: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


def process_free_dlq(ch, method, properties, body):
    """
    Regular tier notifications (after TTL wait).
    Orchestration Logic: Check stock availability before triggering alert.
    """
    try:
        data = json.loads(body)
        phone = data.get('phone')
        message = data.get('message')
        item_id = data.get('item_id')

        print(f"[NOTIF-ORCH] Regular event (post-TTL) for item {item_id} -> {phone}")

        # Business Logic: Final stock check before notifying regular-tier user
        try:
            qty_resp = requests.get(
                f"{INVENTORY_SERVICE_URL}/{item_id}/quantity",
                timeout=5
            )
            if qty_resp.status_code == 200:
                qty = qty_resp.json().get('quantity', 0)
                if qty <= 0:
                    print(f"[NOTIF-ORCH] Item {item_id} sold out. Skipping notification for {phone}.")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return
                print(f"[NOTIF-ORCH] Item {item_id} still has {qty} units. Proceeding.")
            else:
                print(f"[NOTIF-ORCH] Stock check unavailable (status {qty_resp.status_code}). Proceeding anyway.")
        except Exception as e:
            print(f"[NOTIF-ORCH] Stock check failed: {e}. Proceeding anyway.")

        trigger_alert_wrapper(phone, message)

    except Exception as e:
        print(f"[NOTIF-ORCH] Error processing regular DLQ message: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


def process_direct_alert(ch, method, properties, body):
    """Immediate system alerts (e.g., checkout notifications)."""
    try:
        data = json.loads(body)
        phone = data.get('phone')
        message = data.get('message')
        
        print(f"[NOTIF-ORCH] Direct system alert -> {phone}")
        trigger_alert_wrapper(phone, message)
        
    except Exception as e:
        print(f"[NOTIF-ORCH] Error processing direct alert: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


def consume_background():
    """Connect to RabbitMQ and start consuming notification events."""
    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=RABBITMQ_HOST)
            )
            channel = connection.channel()

            channel.exchange_declare(
                exchange='chomp_events',
                exchange_type='topic',
                durable=True
            )

            # Premium Queue
            channel.queue_declare(queue='premium_notification_queue', durable=True)
            channel.queue_bind(exchange='chomp_events', queue='premium_notification_queue', routing_key='notification.premium')

            # Dead Letter Queue (Regular Users)
            channel.queue_declare(queue='free_notification_dlq', durable=True)
            channel.queue_bind(exchange='chomp_events', queue='free_notification_dlq', routing_key='notification.regular.dlq')

            # Direct Alert Queue
            channel.queue_declare(queue='direct_alert_queue', durable=True)
            channel.queue_bind(exchange='chomp_events', queue='direct_alert_queue', routing_key='alert.send')

            channel.basic_consume(queue='premium_notification_queue', on_message_callback=process_premium)
            channel.basic_consume(queue='free_notification_dlq', on_message_callback=process_free_dlq)
            channel.basic_consume(queue='direct_alert_queue', on_message_callback=process_direct_alert)

            print('[NOTIF-ORCH] Connected to RabbitMQ. Consuming flows...')
            channel.start_consuming()

        except Exception as e:
            print(f"[NOTIF-ORCH] RabbitMQ connection failed: {e}. Retrying in 5s...")
            time.sleep(5)


# Start RabbitMQ consumer in background thread
_consumer_thread = threading.Thread(target=consume_background, daemon=True)
_consumer_thread.start()


@app.route('/api/v1/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "notification-orchestrator"}), 200


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5012))
    app.run(host='0.0.0.0', port=port)
