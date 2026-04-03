from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker
import os

app = Flask(__name__)

# Database Configuration
DB_URL = os.environ.get("DATABASE_URL", "postgresql://order_user:order_pass@postgres:5432/order_db")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Order(Base):
    __tablename__ = "orders"
    orderID = Column(Integer, primary_key=True, index=True)
    customerID = Column(String, index=True)
    merchantID = Column(String, index=True)
    merchant_name = Column(String, nullable=True) # Added for better history display
    itemID = Column(Integer)
    item_price = Column(Float)
    total_paid = Column(Float)
    status = Column(String, default="paid")
    paymentID = Column(String, nullable=True)
    quantity = Column(Integer, default=1)

Base.metadata.create_all(bind=engine)

@app.route('/api/v1/orders', methods=['POST'])
def create_order():
    """Atomic endpoint to persist order history."""
    data = request.json
    db = SessionLocal()
    try:
        quantity = data.get('quantity', 1)
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return jsonify({"error": "Order quantity must be an integer."}), 400

        if quantity <= 0:
            return jsonify({"error": "Order quantity must be greater than 0."}), 400
        if quantity >= 1000:
            return jsonify({"error": "Order quantity must be less than 1000."}), 400

        price = data.get('price')
        try:
            price = float(price)
        except (TypeError, ValueError):
            return jsonify({"error": "Item price must be a number."}), 400

        if price <= 0:
            return jsonify({"error": "Item price must be greater than 0."}), 400

        total_paid = data.get('total_paid')
        try:
            total_paid = float(total_paid)
        except (TypeError, ValueError):
            return jsonify({"error": "Total paid must be a number."}), 400

        if total_paid <= 0:
            return jsonify({"error": "Total paid must be greater than 0."}), 400

        new_order = Order(
            customerID=data.get('customerID'),
            merchantID=data.get('merchantID'),
            merchant_name=data.get('merchant_name'), # Added for better history display
            itemID=data.get('itemID'),
            quantity=quantity,
            item_price=price,
            total_paid=total_paid,
            paymentID=data.get('paymentID'),
            status=data.get('status', 'paid')
        )
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        return jsonify({"message": "Order history persisted", "orderID": new_order.orderID}), 201
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
            "merchant_name": o.merchant_name or "Unknown Merchant",
            "itemID": o.itemID,
            "total_paid": o.total_paid,
            "status": o.status,
            "paymentID": o.paymentID,
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
                "paymentID": order.paymentID,
                "quantity": order.quantity
            }), 200
        return jsonify({"error": "Order not found"}), 404
    finally:
        db.close()

@app.route('/api/v1/orders/merchant/<string:merchant_id>', methods=['GET'])
def get_merchant_orders(merchant_id):
    """Fetch all orders for a specific merchant."""
    db = SessionLocal()
    try:
        orders = db.query(Order).filter(Order.merchantID == merchant_id).order_by(Order.orderID.desc()).all()
        return jsonify([{
            "orderID": o.orderID,
            "customerID": o.customerID,
            "merchantID": o.merchantID,
            "merchant_name": o.merchant_name or "Unknown Merchant",
            "itemID": o.itemID,
            "total_paid": o.total_paid,
            "status": o.status,
            "paymentID": o.paymentID,
            "quantity": o.quantity
        } for o in orders]), 200
    finally:
        db.close()

@app.route('/api/v1/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Update the status of a specific order."""
    data = request.json
    new_status = data.get('status')
    if not new_status:
        return jsonify({"error": "status field is required"}), 400
        
    db = SessionLocal()
    try:
        order = db.query(Order).get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
            
        order.status = new_status
        db.commit()
        db.refresh(order)
        
        return jsonify({
            "orderID": order.orderID,
            "status": order.status,
            "message": "Status updated successfully"
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5002))
    app.run(host='0.0.0.0', port=port)
