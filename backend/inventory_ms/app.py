from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
import os
import json
import pika

app = Flask(__name__)

# Database Configuration
DB_URL = os.environ.get("DATABASE_URL", "postgresql://inventory_user:inventory_pass@chomp-postgres:5432/inventory_db")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")


class Item(Base):
    __tablename__ = "items"
    itemID = Column(Integer, primary_key=True, index=True)
    merchantID = Column(String, index=True)
    merchant_name = Column(String)
    name = Column(String)
    price = Column(Float)
    original_price = Column(Float)
    quantity = Column(Integer)
    status = Column(String, default="available")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(bind=engine)


# ─────────────────────────────────────────
# RabbitMQ Publisher
# ─────────────────────────────────────────

def publish_listing_event(item):
    """Publish box.listed event to RabbitMQ after a new listing is created."""
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
        payload = {
            'itemID': item.itemID,
            'name': item.name,
            'price': item.price,
            'merchantID': item.merchantID,
            'merchant_name': item.merchant_name
        }
        channel.basic_publish(
            exchange='chomp_events',
            routing_key='listing.new',
            body=json.dumps(payload),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print(f"[INVENTORY-MS] ✅ Published listing.new event for item {item.itemID}")
    except Exception as e:
        print(f"[INVENTORY-MS] ⚠️ Failed to publish listing event: {e}")


# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────

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

        # Publish box.listed event to RabbitMQ for Scenario 1 notification flow
        publish_listing_event(new_item)

        return jsonify({
            "message": "Item created successfully",
            "itemID": new_item.itemID
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@app.route('/api/v1/inventory', methods=['GET'])
def get_items():
    db = SessionLocal()
    try:
        items = db.query(Item).filter(Item.status == 'available').all()
        result = []
        for item in items:
            result.append({
                "itemID": item.itemID,
                "merchantID": item.merchantID,
                "merchant_name": item.merchant_name or f"Merchant #{item.merchantID}",
                "name": item.name,
                "price": item.price,
                "original_price": item.original_price,
                "quantity": item.quantity,
                "status": item.status,
                "created_at": item.created_at.isoformat() if item.created_at else None
            })
        return jsonify(result), 200
    finally:
        db.close()


@app.route('/api/v1/inventory/<int:item_id>/quantity', methods=['GET'])
def get_item_quantity(item_id):
    """
    Availability check endpoint.
    Called by Alert MS before sending Free user notifications after TTL expires.
    """
    db = SessionLocal()
    try:
        item = db.query(Item).filter(Item.itemID == item_id).first()
        if not item:
            return jsonify({"error": "Item not found"}), 404
        return jsonify({
            "itemID": item.itemID,
            "quantity": item.quantity,
            "status": item.status
        }), 200
    finally:
        db.close()


@app.route('/api/v1/inventory/<int:item_id>/reserve', methods=['POST'])
def reserve_item(item_id):
    db = SessionLocal()
    try:
        data = request.json
        qty = data.get('quantity', 1)

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
            return jsonify({"error": "Item not found"}), 404

        old_val = item.quantity
        item.quantity += qty
        item.status = "available"

        db.commit()
        print(f"RELEASE [SUCCESS]: Item {item_id} quantity: {old_val} -> {item.quantity}")
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
                "status": item.status,
                "created_at": item.created_at.isoformat() if item.created_at else None
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


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port)