import pika
import json
import os
import time
import requests
from twilio.rest import Client

# Configuration
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")
USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://user-ms:5006/api/v1/users")
REGULAR_DELAY_SECONDS = int(os.environ.get("REGULAR_DELAY_SECONDS", "30"))

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER")

def send_real_sms(phone, message):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print("[NOTIFICATION] ⚠️ Twilio credentials missing. Falling back to mock.")
        print(f"[TWILIO MOCK] 📱 Sending SMS to {phone}: {message}")
        return

    # Hardcoded demo number rule:
    if phone != "+6598261606":
        print(f"[NOTIFICATION] 🔀 Demo mode active. Skipping SMS to unverified number: {phone}")
        return

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        msg_obj = client.messages.create(
            body=message,
            from_=TWILIO_FROM_NUMBER,
            to=phone
        )
        print(f"[NOTIFICATION] ✅ SMS sent successfully! SID: {msg_obj.sid}")
    except Exception as e:
        print(f"[NOTIFICATION] ❌ Failed to send SMS via Twilio: {e}")

def get_user_info(user_id):
    try:
        response = requests.get(f"{USER_SERVICE_URL}/{user_id}")
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error fetching user: {e}")
    return None

def get_all_users():
    try:
        response = requests.get(USER_SERVICE_URL)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error fetching all users: {e}")
    return []

def delayed_sms_worker(users, message):
    print(f"[NOTIFICATION] 🕒 Delaying SMS for {len(users)} regular users by {REGULAR_DELAY_SECONDS} seconds...")
    time.sleep(REGULAR_DELAY_SECONDS)
    for u in users:
        if u.get('phone'):
            print(f"[NOTIFICATION] ⏰ Sending delayed SMS to Regular user {u['name']}")
            send_real_sms(u['phone'], message)

def process_event(ch, method, properties, body):
    data = json.loads(body)
    routing_key = method.routing_key
    print(f"[*] Received event: {routing_key}")

    if routing_key == 'courier.not_found':
        customer_id = data.get('customerID')
        order_id = data.get('orderID')
        user = get_user_info(customer_id)
        
        if user and user.get('phone'):
            msg = f"ChompChomp: We couldn't find a courier for your order #{order_id}. Please open the app to switch to self-pickup or cancel for a refund."
            send_real_sms(user['phone'], msg)
        else:
            print(f"[NOTIFICATION] ⚠️ No phone number found for user {customer_id}")

    elif routing_key == 'box.listed':
        item_name = data.get('name')
        price = data.get('price')
        merchant_id = data.get('merchantID')
        
        merchant_user = get_user_info(merchant_id) if merchant_id else None
        merchant_name = merchant_user.get('name') if merchant_user else 'A restaurant'
        
        msg = f"Flash Sale Alert! {merchant_name} just listed {item_name} for ${price:.2f}. Grab it on ChompChomp before it's gone!"

        all_users = get_all_users()
        # Filter for actual customers with the verified Twilio phone number (ignore merchants)
        customers = [u for u in all_users if u.get('role') == 'user' and u.get('phone') == '+6598261606']
        
        premium_users = [u for u in customers if u.get('tier') == 'premium']
        regular_users = [u for u in customers if u.get('tier') != 'premium']

        # Prevent demo spam: limit to 1 recipient per tier
        premium_users = premium_users[:1]
        regular_users = regular_users[:1]
        
        print(f"[NOTIFICATION] 🔔 Item listed: {item_name} for ${price}")
        
        # 1. Immediate SMS for Premium users
        print(f"[NOTIFICATION] 🚀 Sending immediate SMS to {len(premium_users)} Premium users.")
        for pu in premium_users:
            if pu.get('phone'):
                send_real_sms(pu['phone'], msg)
                
        # 2. Delayed SMS for Regular users (run in background thread so we can ACK message)
        import threading
        if regular_users:
            threading.Thread(target=delayed_sms_worker, args=(regular_users, msg), daemon=True).start()

    ch.basic_ack(delivery_tag=method.delivery_tag)

def consume():
    retries = 10
    while retries > 0:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
            channel = connection.channel()
            channel.exchange_declare(exchange='chomp_events', exchange_type='topic')
            
            result = channel.queue_declare(queue='notification_queue', exclusive=False)
            queue_name = result.method.queue
            
            # Bind to relevant events
            channel.queue_bind(exchange='chomp_events', queue=queue_name, routing_key='courier.not_found')
            channel.queue_bind(exchange='chomp_events', queue=queue_name, routing_key='box.listed')
            
            channel.basic_consume(queue=queue_name, on_message_callback=process_event)
            
            print(' [*] Notification Service Waiting for messages...')
            channel.start_consuming()
        except Exception as e:
            print(f"Connection failed: {e}. Retrying in 5 seconds...")
            retries -= 1
            time.sleep(5)

if __name__ == '__main__':
    consume()
