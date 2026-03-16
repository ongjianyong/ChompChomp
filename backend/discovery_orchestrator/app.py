from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import math
import json
import pika

app = Flask(__name__)
CORS(app)

# Configuration
INVENTORY_SERVICE_URL = os.environ.get("INVENTORY_SERVICE_URL", "http://inventory-ms:5001/api/v1/inventory")
USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://user-ms:5006/api/v1/users")
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    R = 6371.0 # Radius of earth in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_coordinates(postal_code):
    """Fetch lat/long from OneMap SG API."""
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

@app.route('/api/v1/discovery/listings', methods=['GET'])
def get_listings():
    """Composite endpoint to fetch listings with distance info."""
    user_lat = request.args.get('lat', type=float)
    user_long = request.args.get('long', type=float)
    max_dist = request.args.get('max_dist', type=float)
    
    try:
        # 1. Fetch Atomic Data
        inventory_resp = requests.get(INVENTORY_SERVICE_URL, timeout=5)
        users_resp = requests.get(USER_SERVICE_URL, timeout=5)
        
        if inventory_resp.status_code != 200 or users_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch data from atomic services"}), 502
            
        items = inventory_resp.json()
        users = users_resp.json()
        
        # Create a map of merchant coordinates
        merchant_coords = {u['id']: (u.get('lat'), u.get('long')) for u in users if u.get('role') == 'merchant'}
        
        # 2. Composition & Logic
        result = []
        for item in items:
            m_id = item.get('merchantID')
            m_lat, m_long = merchant_coords.get(m_id, (None, None))
            
            dist = None
            if user_lat is not None and user_long is not None and m_lat is not None and m_long is not None:
                dist = haversine(user_lat, user_long, m_lat, m_long)
            
            if max_dist is not None:
                if dist is None or dist > max_dist:
                    continue
                    
            item_with_dist = item.copy()
            item_with_dist['distance'] = round(dist, 2) if dist is not None else None
            result.append(item_with_dist)
            
        # Sorting
        if user_lat is not None and user_long is not None:
            result.sort(key=lambda x: (x['distance'] is None, x['distance']))
            
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/discovery/listings', methods=['POST'])
def create_listing():
    """Composite endpoint to create a listing and handle geocoding."""
    data = request.json
    merchant_id = data.get('merchantID')
    postal_code = data.get('postal_code')
    
    try:
        # 1. Geocoding logic (External API)
        lat, long = None, None
        if postal_code:
            lat, long = get_coordinates(postal_code)
            
        # 2. Update Merchant Location in Account MS (Atomic)
        if lat and long:
            requests.put(f"{USER_SERVICE_URL}/{merchant_id}", json={
                "lat": lat,
                "long": long,
                "postal_code": postal_code
            }, timeout=5)
            
        # 3. Create Item in Catalog MS (Atomic)
        inventory_resp = requests.post(INVENTORY_SERVICE_URL, json=data, timeout=5)
        
        if inventory_resp.status_code == 201:
            # 4. Scenario 1: Trigger tiered notifications (Asynchronous)
            # Fetch user tiers from Account MS
            users_resp = requests.get(USER_SERVICE_URL, timeout=5)
            if users_resp.status_code == 200:
                all_users = users_resp.json()
                
                # Filter for premium/regular
                premium = [u for u in all_users if u.get('tier') == 'premium' and u.get('role') == 'user']
                regular = [u for u in all_users if u.get('tier') != 'premium' and u.get('role') == 'user']
                
                # Logic: Immediate for premium, delayed for regular
                # We'll publish events that the Alert MS will handle or we handle here
                # For Phase 1/2, let's keep it simple: publish to Alert MS
                item_data = inventory_resp.json()
                msg = f"Flash Sale! {data.get('name')} listed for ${data.get('price')}!"
                
                for u in premium:
                    if u.get('phone'):
                        publish_event('alert.send', {"phone": u['phone'], "message": f"[PREMIUM] {msg}"})
                
                # For regular, we could use a delay exchange in RabbitMQ 
                # or just have the orchestrator manage a timer.
                # To follow SOA, the orchestrator should manage the workflow.
                import threading
                def delayed_alert():
                    import time
                    time.sleep(30) # 30s delay for demo
                    for u in regular:
                        if u.get('phone'):
                            publish_event('alert.send', {"phone": u['phone'], "message": f"[DELAYED] {msg}"})
                
                threading.Thread(target=delayed_alert, daemon=True).start()

            return jsonify(inventory_resp.json()), 201
            
        return jsonify(inventory_resp.json()), inventory_resp.status_code
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5010))
    app.run(host='0.0.0.0', port=port)
