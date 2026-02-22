"""
evaluate_spotfake.py
--------------------
Automated evaluation for SpotFake (Fake/Real news classifier).

What it does:
- Loads Fake.csv + True.csv (or the combined CSV we generated).
- Builds a test set (stratified).
- Sends each article to your model endpoint (PREDICT_URL) to get prediction + confidence.
- Computes metrics: Accuracy, Precision, Recall, F1, Confusion Matrix.
- Saves outputs: evaluation_results.csv, metrics.json, confusion_matrix.png

Usage (Mac/Linux):
1) pip install -U pandas numpy requests scikit-learn matplotlib
2) export PREDICT_URL="https://YOUR-DEPLOYED-API/predict"   # or localhost endpoint
3) python evaluate_spotfake.py

Expected API contract:
POST { "text": "<news content>" }
Returns JSON like:
{ "label": "Fake" | "Real", "confidence": 0.0-1.0 }

If your API uses different keys, edit parse_response() below.
"""

import os
import re
import time
import json
import argparse
import pandas as pd
import numpy as np
import requests
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import matplotlib.pyplot as plt


def clean_ws(s: str) -> str:
    if s is None or (isinstance(s, float) and np.isnan(s)):
        return ""
    s = str(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def load_dataset(fake_csv: str, true_csv: str) -> pd.DataFrame:
    fake = pd.read_csv(fake_csv)
    true = pd.read_csv(true_csv)
    fake["label"] = 0
    true["label"] = 1

    for df in (fake, true):
        if "title" not in df.columns: df["title"] = ""
        if "text" not in df.columns: df["text"] = ""
        df["title"] = df["title"].map(clean_ws)
        df["text"] = df["text"].map(clean_ws)
        df["content"] = (df["title"] + " " + df["text"]).str.strip()

    data = pd.concat([fake, true], ignore_index=True)
    return data[["content", "label"]].dropna()


def parse_response(resp_json: dict) -> tuple[int, float]:
    """
    Convert your API response into:
    - predicted_label: 0 for Fake, 1 for Real
    - confidence: float in [0,1]
    """
    label_raw = (resp_json.get("label") or resp_json.get("prediction") or "").strip().lower()
    conf = resp_json.get("confidence", resp_json.get("score", None))

    # Map label text -> integer
    if label_raw in ["real", "true", "1", "genuine"]:
        y_pred = 1
    elif label_raw in ["fake", "false", "0"]:
        y_pred = 0
    else:
        raise ValueError(f"Unknown label in response: {resp_json}")

    # Confidence fallback
    if conf is None:
        conf = float("nan")
    else:
        conf = float(conf)

    return y_pred, conf


def call_predict(text: str, url: str, timeout: int = 30) -> dict:
    r = requests.post(url, json={"text": text}, timeout=timeout)
    r.raise_for_status()
    return r.json()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fake_csv", default="Fake.csv")
    ap.add_argument("--true_csv", default="True.csv")
    ap.add_argument("--test_size", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--max_samples", type=int, default=2000,
                    help="Limit evaluation size for speed (0 = all).")
    ap.add_argument("--sleep", type=float, default=0.0,
                    help="Optional delay between requests (seconds) to avoid rate limits.")
    args = ap.parse_args()

    url = os.environ.get("PREDICT_URL")
    if not url:
        raise SystemExit("❌ Please set PREDICT_URL env var (your model API endpoint).")

    data = load_dataset(args.fake_csv, args.true_csv)

    # Stratified split
    train_df, test_df = train_test_split(
        data, test_size=args.test_size, random_state=args.seed, stratify=data["label"]
    )

    if args.max_samples and args.max_samples > 0:
        test_df = test_df.sample(n=min(args.max_samples, len(test_df)),
                                 random_state=args.seed, stratify=test_df["label"])

    y_true = test_df["label"].to_numpy()
    preds = []
    confs = []
    errors = 0

    for i, row in enumerate(test_df.itertuples(index=False), start=1):
        try:
            resp = call_predict(row.content, url=url)
            y_pred, conf = parse_response(resp)
            preds.append(y_pred)
            confs.append(conf)
        except Exception as e:
            errors += 1
            preds.append(np.nan)
            confs.append(np.nan)
        if args.sleep > 0:
            time.sleep(args.sleep)
        if i % 100 == 0:
            print(f"Processed {i}/{len(test_df)}... (errors: {errors})")

    out = test_df.copy()
    out["y_pred"] = preds
    out["confidence"] = confs

    # Drop failed rows
    ok = out["y_pred"].notna()
    out_ok = out.loc[ok].copy()

    y_true_ok = out_ok["label"].astype(int).to_numpy()
    y_pred_ok = out_ok["y_pred"].astype(int).to_numpy()

    acc = float(accuracy_score(y_true_ok, y_pred_ok))
    pr, rc, f1, _ = precision_recall_fscore_support(y_true_ok, y_pred_ok, average="binary", pos_label=1)

    cm = confusion_matrix(y_true_ok, y_pred_ok, labels=[0, 1]).tolist()

    metrics = {
        "samples_total_in_test": int(len(test_df)),
        "samples_evaluated": int(len(out_ok)),
        "errors": int(errors),
        "accuracy": acc,
        "precision_real": float(pr),
        "recall_real": float(rc),
        "f1_real": float(f1),
        "confusion_matrix_labels": ["Fake(0)", "Real(1)"],
        "confusion_matrix": cm,
        "predict_url": url,
    }

    out_ok.to_csv("evaluation_results.csv", index=False)
    with open("metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    # Plot confusion matrix
    plt.figure()
    cm_np = np.array(cm)
    plt.imshow(cm_np, interpolation="nearest")
    plt.title("Confusion Matrix")
    plt.xticks([0, 1], ["Fake", "Real"])
    plt.yticks([0, 1], ["Fake", "Real"])
    for (r, c), v in np.ndenumerate(cm_np):
        plt.text(c, r, str(v), ha="center", va="center")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    plt.savefig("confusion_matrix.png", dpi=200)
    plt.close()

    print("✅ Done. Files saved: evaluation_results.csv, metrics.json, confusion_matrix.png")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
