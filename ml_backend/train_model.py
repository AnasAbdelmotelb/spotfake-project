import pandas as pd
import re
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report


# ----------------------------
# Clean text function
# ----------------------------
def clean_text(text):
    """
    Clean and normalize text:
    - Lowercase
    - Remove numbers
    - Remove special characters
    """
    text = text.lower()
    text = re.sub(r'\d+', '', text)
    text = re.sub(r'[^\w\s]', '', text)
    return text


# ----------------------------
# Load datasets
# ----------------------------
print("Loading datasets...")

fake = pd.read_csv("../Data/Fake.csv")
true = pd.read_csv("../Data/True.csv")

fake["label"] = 0   # Fake = 0
true["label"] = 1   # Real = 1

data = pd.concat([fake, true])

print("Total samples:", len(data))


# ----------------------------
# Preprocess text
# ----------------------------
print("Cleaning text...")

data["text"] = data["text"].astype(str)
data["text"] = data["text"].apply(clean_text)


# ----------------------------
# Split data
# ----------------------------
X = data["text"]
y = data["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))


# ----------------------------
# Vectorization (TF-IDF)
# ----------------------------
print("Vectorizing text...")

vectorizer = TfidfVectorizer(
    stop_words="english",
    max_df=0.7
)

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)


# ----------------------------
# Train model
# ----------------------------
print("Training model...")

model = LogisticRegression()
model.fit(X_train_vec, y_train)


# ----------------------------
# Evaluate model
# ----------------------------
print("Evaluating model...")

y_pred = model.predict(X_test_vec)

accuracy = accuracy_score(y_test, y_pred)

print("Accuracy:", accuracy)
print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))


# ----------------------------
# Save model and vectorizer
# -------------------------
# Save trained model & vectorizer for later inference (API usage)
import joblib

joblib.dump(vectorizer, "vectorizer.pkl")
joblib.dump(model, "spotfake_model.pkl")

print("✅ Saved: vectorizer.pkl and spotfake_model.pkl")
