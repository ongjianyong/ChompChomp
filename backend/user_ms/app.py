from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
import os
import jwt
import datetime
import bcrypt
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'chompchomp_secret_key_123')
DB_URL = os.environ.get("DATABASE_URL", "postgresql://user_user:user_pass@chomp-postgres:5432/user_db")
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")
app.config['SQLALCHEMY_DATABASE_URI'] = DB_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    role = db.Column(db.String(20), nullable=False) # 'user' or 'merchant'
    tier = db.Column(db.String(20), default='regular') # 'regular' or 'premium'
    postal_code = db.Column(db.String(10), nullable=True)
    lat = db.Column(db.Float, nullable=True)
    long = db.Column(db.Float, nullable=True)

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "tier": self.tier,
            "postal_code": self.postal_code,
            "lat": self.lat,
            "long": self.long
        }

# Initialize Database
with app.app_context():
    db.create_all()
    # Add seed data if empty
    if not User.query.filter_by(email='alice@user.com').first():
        alice_pwd = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        alice = User(name="Alice (Premium)", email="alice@user.com", password_hash=alice_pwd, phone="+6591234567", role="user", tier="premium")
        
        merchant_pwd = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        merchant = User(name="Balthazar Bakery", email="merchant@chomp.com", password_hash=merchant_pwd, phone="+6588888888", role="merchant")
        
        db.session.add(alice)
        db.session.add(merchant)
        db.session.commit()

def get_coordinates(postal_code):
    """Helper to fetch lat/long from OneMap SG API."""
    if not postal_code or len(postal_code) != 6:
        return None, None
    try:
        url = f"https://www.onemap.gov.sg/api/common/elastic/search?searchVal={postal_code}&returnGeom=Y&getAddrDetails=Y"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('found', 0) > 0:
                result = data['results'][0]
                return float(result['LATITUDE']), float(result['LONGITUDE'])
    except Exception as e:
        print(f"OneMap API error: {e}")
    return None, None

def publish_event(event_type, payload):
    """Helper to publish events to RabbitMQ."""
    try:
        import pika
        import json
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

@app.route('/api/v1/users/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if user and bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        token = jwt.encode({
            'sub': str(user.id),
            'iss': 'chomp-issuer',
            'role': user.role,
            'tier': user.tier,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({'token': token, 'user': user.to_dict()}), 200

    return jsonify({"error": "Invalid email or password"}), 401

@app.route('/api/v1/users/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    phone = data.get('phone')
    role = data.get('role', 'user')

    if not all([name, email, password, phone]):
        return jsonify({"error": "Name, email, password and phone are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already in use"}), 409

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = User(
        name=name,
        email=email,
        password_hash=hashed_password,
        phone=phone,
        role=role,
        tier='regular',
        postal_code=data.get('postal_code')
    )

    if new_user.postal_code:
        lat, long = get_coordinates(new_user.postal_code)
        new_user.lat = lat
        new_user.long = long

    db.session.add(new_user)
    db.session.commit()

    # Broadcast event if merchant or if location changed
    if new_user.lat and new_user.long:
        publish_event('user.location_updated', {
            "userID": str(new_user.id),
            "role": new_user.role,
            "lat": new_user.lat,
            "long": new_user.long
        })

    token = jwt.encode({
        'sub': str(new_user.id),
        'iss': 'chomp-issuer',
        'role': new_user.role,
        'tier': new_user.tier,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({'token': token, 'user': new_user.to_dict()}), 201

@app.route('/api/v1/users/<user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if user:
        return jsonify(user.to_dict()), 200
    return jsonify({"error": "User not found"}), 404

@app.route('/api/v1/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@app.route('/api/v1/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    data = request.json
    print(f"DEBUG: Updating user {user_id} with data: {data}")
    
    try:
        if 'name' in data:
            user.name = data['name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'postal_code' in data and data['postal_code'] != user.postal_code:
            user.postal_code = data['postal_code']
            lat, long = get_coordinates(user.postal_code)
            user.lat = lat
            user.long = long
            
        db.session.commit()
        print(f"DEBUG: Successfully committed updates for user {user_id}")

        # Broadcast event
        if user.lat and user.long:
            try:
                publish_event('user.location_updated', {
                    "userID": str(user.id),
                    "role": user.role,
                    "lat": user.lat,
                    "long": user.long
                })
                print(f"DEBUG: Published location update for user {user_id}")
            except Exception as pe:
                print(f"DEBUG: Failed to publish event: {pe}")
        
        return jsonify(user.to_dict()), 200
    except Exception as e:
        print(f"DEBUG: ERROR updating user {user_id}: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/users/<user_id>/tier', methods=['PUT'])
def update_user_tier(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    data = request.json
    new_tier = data.get('tier')
    
    if new_tier not in ['regular', 'premium']:
        return jsonify({"error": "Invalid tier. Must be 'regular' or 'premium'"}), 400
        
    user.tier = new_tier
    db.session.commit()
    
    return jsonify(user.to_dict()), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5006))
    app.run(host='0.0.0.0', port=port)
