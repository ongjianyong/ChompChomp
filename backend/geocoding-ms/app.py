from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

ONEMAP_URL = "https://www.onemap.gov.sg/api/common/elastic/search"

@app.route('/api/v1/geocode', methods=['GET'])
def geocode():
    postal_code = request.args.get('postal_code', '')

    if not postal_code or len(postal_code) != 6:
        return jsonify({"error": "Invalid postal code"}), 400

    try:
        resp = requests.get(ONEMAP_URL, params={
            "searchVal": postal_code,
            "returnGeom": "Y",
            "getAddrDetails": "Y"
        }, timeout=5)

        if resp.status_code == 200:
            data = resp.json()
            if data.get('found', 0) > 0:
                result = data['results'][0]
                return jsonify({
                    "lat": float(result['LATITUDE']),
                    "long": float(result['LONGITUDE'])
                }), 200

        return jsonify({"error": "Postal code not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5007))
    app.run(host='0.0.0.0', port=port)