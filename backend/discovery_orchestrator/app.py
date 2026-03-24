from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import math
import json
import pika
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

# Configuration
INVENTORY_SERVICE_URL = os.environ.get("INVENTORY_SERVICE_URL", "http://inventory-ms:5001/api/v1/inventory")
USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://user-ms:5006/api/v1/users")
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

# ─────────────────────────────────────────
# TTL config — change this value only
# Demo: 60,000ms (1 min) | Production: 600,000ms (10 min)
# ─────────────────────────────────────────
FREE_QUEUE_TTL_MS = 60000        # 60 seconds for demo
FREE_VISIBILITY_SECONDS = 60     # Must match TTL above (in seconds)


# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    R = 6371.0
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


def publish_tiered_notifications(item_id, item_name, item_price, premium_users, free_users):
    """
    Scenario 1: Tiered Notification via TTL + Dead Letter Queue pattern.

    Premium customers → published to premium_notification_queue
                        (no TTL, Alert MS consumes immediately)

    Free customers    → published to free_notification_queue
                        (TTL = FREE_QUEUE_TTL_MS)
                        After TTL expires, RabbitMQ routes messages to
                        free_notification_dlq automatically.
                        Alert MS consumes from DLQ, checks availability,
                        then sends SMS via Twilio.

    Note: Both Premium and Free refer to CUSTOMER tiers, not merchants.
    Merchants are not notified — they are the ones creating listings.
    """
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

        # ── Premium Customer Queue ─────────────────────────────────
        channel.queue_declare(
            queue='premium_notification_queue',
            durable=True
        )
        channel.queue_bind(
            exchange='chomp_events',
            queue='premium_notification_queue',
            routing_key='notification.premium'
        )

        # ── Free Customer Queue (TTL) ──────────────────────────────
        # Messages sit here for FREE_QUEUE_TTL_MS then route to DLQ.
        # Alert MS does NOT consume from this queue directly.
        channel.queue_declare(
            queue='free_notification_queue',
            durable=True,
            arguments={
                'x-message-ttl': FREE_QUEUE_TTL_MS,
                'x-dead-letter-exchange': 'chomp_events',
                'x-dead-letter-routing-key': 'notification.free.dlq'
            }
        )
        channel.queue_bind(
            exchange='chomp_events',
            queue='free_notification_queue',
            routing_key='notification.free'
        )

        # ── Dead Letter Queue ──────────────────────────────────────
        # Alert MS consumes from here after TTL expires.
        channel.queue_declare(
            queue='free_notification_dlq',
            durable=True
        )
        channel.queue_bind(
            exchange='chomp_events',
            queue='free_notification_dlq',
            routing_key='notification.free.dlq'
        )

        msg_body = f"Flash Sale! {item_name} listed for ${item_price}! Self-pickup only."

        # Publish to Premium Customer Queue — consumed immediately
        premium_count = 0
        for u in premium_users:
            if u.get('phone'):
                channel.basic_publish(
                    exchange='chomp_events',
                    routing_key='notification.premium',
                    body=json.dumps({
                        'phone': u['phone'],
                        'item_id': item_id,
                        'message': f"[PREMIUM EARLY ACCESS] {msg_body}",
                        'tier': 'premium'
                    }),
                    properties=pika.BasicProperties(delivery_mode=2)
                )
                premium_count += 1

        # Publish to Free Customer Queue — delayed by TTL
        free_count = 0
        for u in free_users:
            if u.get('phone'):
                channel.basic_publish(
                    exchange='chomp_events',
                    routing_key='notification.free',
                    body=json.dumps({
                        'phone': u['phone'],
                        'item_id': item_id,
                        'message': msg_body,
                        'tier': 'free'
                    }),
                    properties=pika.BasicProperties(delivery_mode=2)
                )
                free_count += 1

        connection.close()
        print(f"[DISCOVERY] ✅ Published {premium_count} premium (immediate) and {free_count} free (TTL {FREE_QUEUE_TTL_MS}ms) notifications for item {item_id}")

    except Exception as e:
        print(f"[DISCOVERY] ⚠️ Failed to publish tiered notifications: {e}")


# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────

@app.route('/api/v1/discovery/listings', methods=['GET'])
@app.route('/api/v1/inventory', methods=['GET'])
def get_listings():
    """
    Composite endpoint — fetch listings with tier-based visibility.

    Premium customers see all listings immediately.
    Free customers only see listings older than FREE_VISIBILITY_SECONDS.
    Merchants are not filtered — they see their own listings via a separate endpoint.
    """
    user_lat = request.args.get('lat', type=float)
    user_long = request.args.get('long', type=float)
    max_dist = request.args.get('max_dist', type=float)
    user_tier = request.args.get('tier', 'free').lower()  # 'premium' or 'free'

    try:
        inventory_resp = requests.get(INVENTORY_SERVICE_URL, timeout=5)
        users_resp = requests.get(USER_SERVICE_URL, timeout=5)

        if inventory_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch inventory"}), 502

        items = inventory_resp.json()
        users = users_resp.json() if users_resp.status_code == 200 else []

        merchant_coords = {
            str(u['id']): (u.get('lat'), u.get('long'))
            for u in users if u.get('role') == 'merchant'
        }

        now = datetime.now(timezone.utc)
        result = []

        for item in items:
            # ── Tier-based visibility ──────────────────────────────
            # Premium customers see everything immediately.
            # Free customers cannot see listings younger than FREE_VISIBILITY_SECONDS.
            if user_tier != 'premium':
                created = item.get('created_at')
                if created:
                    try:
                        created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                        # Make naive datetimes timezone-aware
                        if created_dt.tzinfo is None:
                            created_dt = created_dt.replace(tzinfo=timezone.utc)
                        age_seconds = (now - created_dt).total_seconds()
                        if age_seconds < FREE_VISIBILITY_SECONDS:
                            continue  # Free customer cannot see this listing yet
                    except Exception as e:
                        print(f"[DISCOVERY] Could not parse created_at: {e}")

            # ── Distance calculation ───────────────────────────────
            m_id = str(item.get('merchantID'))
            m_lat, m_long = merchant_coords.get(m_id, (None, None))

            dist = None
            if user_lat is not None and user_long is not None and m_lat and m_long:
                dist = haversine(user_lat, user_long, m_lat, m_long)

            if max_dist is not None:
                if dist is None or dist > max_dist:
                    continue

            item_with_dist = item.copy()
            item_with_dist['distance'] = round(dist, 2) if dist is not None else None
            result.append(item_with_dist)

        if user_lat is not None and user_long is not None:
            result.sort(key=lambda x: (x['distance'] is None, x['distance']))

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/v1/inventory/merchant/<string:merchant_id>', methods=['GET'])
def get_merchant_items(merchant_id):
    """Proxy to Inventory MS for merchant-specific listings. No tier filtering for merchants."""
    try:
        url = f"{INVENTORY_SERVICE_URL}/merchant/{merchant_id}"
        resp = requests.get(url, timeout=5)
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/v1/inventory/<int:item_id>', methods=['PUT', 'DELETE'])
def proxy_inventory_management(item_id):
    """Proxy PUT/DELETE to Inventory MS for merchant dashboard."""
    try:
        url = f"{INVENTORY_SERVICE_URL}/{item_id}"
        if request.method == 'PUT':
            resp = requests.put(url, json=request.json, timeout=5)
        else:
            resp = requests.delete(url, timeout=5)
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/v1/discovery/listings', methods=['POST'])
@app.route('/api/v1/inventory', methods=['POST'])
def create_listing():
    """
    Composite endpoint — Publish Listing MS.
    Coordinates: OneMap geocoding → User MS location update → Inventory MS save → Tiered notifications.
    Only merchants call this endpoint.
    """
    data = request.json
    merchant_id = data.get('merchantID')
    postal_code = data.get('postal_code')

    try:
        # 1. Geocoding — get merchant lat/long from postal code
        lat, long = None, None
        if postal_code:
            lat, long = get_coordinates(postal_code)

        # 2. Update merchant location in User MS
        if lat and long:
            requests.put(f"{USER_SERVICE_URL}/{merchant_id}", json={
                "lat": lat,
                "long": long,
                "postal_code": postal_code
            }, timeout=5)

        # 3. Create listing in Inventory MS
        inventory_resp = requests.post(INVENTORY_SERVICE_URL, json=data, timeout=5)

        if inventory_resp.status_code == 201:
            item_data = inventory_resp.json()
            item_id = item_data.get('itemID')

            # 4. Scenario 1: Fetch all CUSTOMERS split by tier and publish tiered notifications
            # Note: merchants are excluded — they don't receive listing notifications
            users_resp = requests.get(USER_SERVICE_URL, timeout=5)
            if users_resp.status_code == 200:
                all_users = users_resp.json()

                # Only notify customers (role == 'user'), not merchants
                premium_users = [
                    u for u in all_users
                    if u.get('role') == 'user' and u.get('tier') == 'premium'
                ]
                free_users = [
                    u for u in all_users
                    if u.get('role') == 'user' and u.get('tier') != 'premium'
                ]

                publish_tiered_notifications(
                    item_id=item_id,
                    item_name=data.get('name'),
                    item_price=data.get('price'),
                    premium_users=premium_users,
                    free_users=free_users
                )

            return jsonify(item_data), 201

        return jsonify(inventory_resp.json()), inventory_resp.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5010))
    app.run(host='0.0.0.0', port=port)