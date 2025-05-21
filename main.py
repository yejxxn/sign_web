from App import analyze, predict as predict_rule
from predict_api import predict as predict_gemini
from flask import Flask
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.route('/analyze', methods=['POST'])(analyze)
app.route('/predict-rule', methods=['POST'], endpoint='predict_rule')(predict_rule)
app.route('/predict', methods=['POST'], endpoint='predict_gemini')(predict_gemini)

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
