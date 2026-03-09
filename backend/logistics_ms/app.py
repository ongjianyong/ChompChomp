from flask import Flask, jsonify
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker
import pika
import os
import random
import json
import threading
import time

app = Flask(__name__)

# Database Configuration
DB_URL = os.environ.get("DATABASE_URL", "postgresql://logistics_user:logistics_pass@postgres:5432/logistics_db")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# RabbitMQ Configuration
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")
COURIER_TIMEOUT = int(os.environ.get("COURIER_TIMEOUT_SECONDS", "30"))
COURIER_SUCCESS_RATE = float(os.environ.get("COURIER_SUCCESS_RATE", "0.7"))

class DeliveryTask(Base):
    __tablename__ = "delivery_tasks"
    taskID = Column(Integer, primary_key=True, index=True)
    orderID = Column(Integer, index=True)
    courierID = Column(String, nullable=True)
    status = Column(String, default="searching") # searching, assigned, failed_no_couriers

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

def handle_courier_search(order_id, customer_id):
    print(f"Starting {COURIER_TIMEOUT}s courier search for Order {order_id} (Customer {customer_id})...")
    time.sleep(COURIER_TIMEOUT)
    
    db = SessionLocal()
    try:
        success = random.random() < COURIER_SUCCESS_RATE
        
        if success:
            courier_id = f"courier_mock_{random.randint(100, 999)}"
            print(f"Courier {courier_id} found for Order {order_id}")
            task = DeliveryTask(orderID=order_id, courierID=courier_id, status="assigned")
            db.add(task)
            db.commit()
            publish_event('order.dispatched', {"orderID": order_id, "customerID": customer_id, "courierID": courier_id})
        else:
            print(f"No courier found for Order {order_id} after timeout")
            task = DeliveryTask(orderID=order_id, status="failed_no_couriers")
            db.add(task)
            db.commit()
            publish_event('courier.not_found', {"orderID": order_id, "customerID": customer_id})
    except Exception as e:
        print(f"Error in courier search: {e}")
    finally:
        db.close()

def consume_events():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.exchange_declare(exchange='chomp_events', exchange_type='topic')
    
    result = channel.queue_declare(queue='', exclusive=True)
    queue_name = result.method.queue
    
    channel.queue_bind(exchange='chomp_events', queue=queue_name, routing_key='order.paid')
    
    def callback(ch, method, properties, body):
        data = json.loads(body)
        if data.get('delivery_type') == 'delivery':
            # Start background search so we don't block the consumer
            t = threading.Thread(target=handle_courier_search, args=(data['orderID'], data['customerID']))
            t.start()
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    print("Logistics MS consumer started. Waiting for order.paid events...")
    channel.start_consuming()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    # Start consumer thread
    threading.Thread(target=consume_events, daemon=True).start()
    
    port = int(os.environ.get("PORT", 5005))
    app.run(host='0.0.0.0', port=port)
