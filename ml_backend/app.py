import os
import joblib
import numpy as np
from flask import Flask, request, jsonify

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "spotfake_model.pkl")
VECT_PATH  = os.path.join(BASE_DIR, "vectorizer.pkl")

print("MODEL_PATH:", MODEL_PATH)
print("VECT_PATH:", VECT_PATH)

model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECT_PATH)
app = Flask(__name__)


@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data["text"]

    # Vectorize input text
    text_vec = vectorizer.transform([text])

    # Prediction
    prediction = model.predict(text_vec)[0]
    probability = model.predict_proba(text_vec)[0]

    proba = model.predict_proba(text_vec)[0]
    prediction = int(model.predict(text_vec)[0])

    confidence = float(proba[prediction])

    if prediction == 1:
     label = "Real"
    else:
     label = "Fake"


    return jsonify({
        "prediction": label,
        "confidence": round(confidence * 100, 2)
    })


if __name__ == "__main__":
    print("classes_:", model.classes_)
    app.run(debug=True, port=5000)


