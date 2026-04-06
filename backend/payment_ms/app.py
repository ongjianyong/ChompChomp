from flask import Flask, request, jsonify
import os
import stripe
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Stripe Configuration
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

@app.route('/api/v1/payments/charge', methods=['POST'])
def process_payment():
    data = request.json
    order_id = data.get('orderID')
    amount = data.get('amount') # in dollars, e.g., 30.00
    token = data.get('token', 'tok_visa') # Default to simulated token for demo

    try:
        # Create a PaymentIntent on Stripe
        # Use payment_method_data for legacy tokens like 'tok_visa'
        # Removing automatic_payment_methods as it can conflict with manual token usage
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100), # amount in cents
            currency='sgd',
            payment_method_data={
                "type": "card",
                "card": {"token": token},
            },
            confirm=True,
            off_session=True, # Required for immediate confirmation with payment_method_data
            metadata={'orderID': order_id}
        )

        return jsonify({
            "message": "Payment successful",
            "paymentID": intent.id,
            "status": intent.status,
            "amount_charged": amount
        }), 200

    except stripe.error.StripeError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/payments/refund', methods=['POST'])
def process_refund():
    data = request.json
    payment_intent_id = data.get('paymentID')
    amount = data.get('amount') # Optional, for partial refunds

    try:
        print(f"REFUND [DEBUG]: Processing refund for {payment_intent_id}, amount: {amount}")
        if amount:
            refund = stripe.Refund.create(
                payment_intent=payment_intent_id,
                amount=int(amount * 100)
            )
        else:
            refund = stripe.Refund.create(
                payment_intent=payment_intent_id
            )

        print(f"REFUND [SUCCESS]: {refund.id}, status: {refund.status}")
        return jsonify({
            "message": "Refund successful",
            "refundID": refund.id,
            "status": refund.status
        }), 200

    except stripe.error.StripeError as e:
        print(f"REFUND [STRIPE ERROR]: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"REFUND [GENERAL ERROR]: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5003))
    app.run(host='0.0.0.0', port=port)
