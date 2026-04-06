import os
from flask import Flask, request, jsonify
from twilio.rest import Client

app = Flask(__name__)

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER")
TWILIO_TRIAL_NUMBER = os.environ.get("TWILIO_TRIAL_DESTINATION_NUMBER", "+6598261606")


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


@app.route('/api/v1/alert', methods=['POST'])
def trigger_alert():
    """
    Pure Atomic Wrapper Endpoint.
    Sends an alert directly to the recipient.
    Does NOT contain business logic (e.g., stock checks).
    """
    data = request.json
    phone = data.get('phone')
    message = data.get('message')

    if not phone or not message:
        return jsonify({"error": "Phone and message are required"}), 400

    print(f"[ALERT-MS] ✉️  Sending alert → {phone}")
    success = send_real_sms(phone, message)
    
    if success:
        return jsonify({"message": "Alert sent"}), 200
    return jsonify({"error": "Failed to send alert"}), 500


@app.route('/api/v1/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "alert-ms"}), 200


if __name__ == '__main__':
    # Alert MS is now a pure REST service (no RabbitMQ listener)
    port = int(os.environ.get("PORT", 5004))
    app.run(host='0.0.0.0', port=port)