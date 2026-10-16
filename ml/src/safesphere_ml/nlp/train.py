"""ML-6 community report NLP: category, urgency and moderation (spam / abusive) classifiers.

Data: LLM-drafted labelled reports (generate_reports.py) in English, Hinglish and Roman Hindi.
Split: 4-fold StratifiedGroupKFold — whole generation batches are held out (near-duplicate posts
from one batch never appear in both train and test) while every class stays in training.

Models per task:
  • baseline: TF-IDF word 1-2 grams + Logistic Regression
  • main:     TF-IDF word 1-2 grams + char 2-5 grams (robust to Hinglish spelling) + linear SVM,
              probability-calibrated
Metric: macro-F1 on held-out batches.
MuRIL fine-tuning (planned originally) needs ~1 GB of weights and hours of CPU training; it is
left as future work and the report says so.

Usage:  python -m safesphere_ml.nlp.train
Output: ml/models/nlp/{category.joblib, urgency.joblib, moderation.joblib, metrics.json}
"""

from __future__ import annotations

import json

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
import numpy as np
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC

from safesphere_ml.common.paths import MODELS_DIR, RAW_DIR

DATA = RAW_DIR / "nlp" / "generated_reports.jsonl"
OUT = MODELS_DIR / "nlp"
CATEGORIES = ["harassment", "theft", "assault", "accident", "medical", "fire", "infrastructure", "suspicious", "other"]


def load() -> pd.DataFrame:
    df = pd.read_json(DATA, lines=True)
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"].str.len() >= 10].drop_duplicates("text")
    df["moderation"] = df["moderation"].where(df["moderation"].isin(["ok", "spam", "abusive"]), "ok")
    df.loc[df["batch_kind"].isin(["spam", "abusive"]), "moderation"] = df["batch_kind"]
    df["category"] = df["category"].where(df["category"].isin(CATEGORIES), "other")
    df["urgency"] = df["urgency"].where(df["urgency"].isin(["low", "medium", "high"]), "low")
    df["group"] = df["batch_kind"] + "|" + df["style"] + "|" + df["batch"].astype(str)
    return df.reset_index(drop=True)


def baseline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True, lowercase=True)),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced")),
    ])


def main_model() -> Pipeline:
    features = FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, lowercase=True)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, lowercase=True)),
    ])
    svm = CalibratedClassifierCV(LinearSVC(C=0.5, class_weight="balanced"), cv=3)
    return Pipeline([("features", features), ("clf", svm)])


def main() -> None:
    df = load()
    print(f"{len(df)} reports | moderation: {df['moderation'].value_counts().to_dict()}")
    folds = list(StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=5).split(df, df["batch_kind"], df["group"]))
    OUT.mkdir(parents=True, exist_ok=True)
    metrics: dict = {
        "data": f"{len(df)} LLM-drafted reports (English / Hinglish / Roman Hindi)",
        "evaluation": "4-fold StratifiedGroupKFold over generation batches, macro-F1 mean (std)",
        "tasks": {},
    }
    for task in ("category", "urgency", "moderation"):
        rows = df if task == "moderation" else df[df["moderation"] == "ok"]
        base_f1, main_f1, per_class = [], [], {}
        for tr_idx, te_idx in folds:
            tr, te = rows[rows.index.isin(df.index[tr_idx])], rows[rows.index.isin(df.index[te_idx])]
            base = baseline().fit(tr["text"], tr[task])
            model = main_model().fit(tr["text"], tr[task])
            base_f1.append(f1_score(te[task], base.predict(te["text"]), average="macro"))
            pred = model.predict(te["text"])
            main_f1.append(f1_score(te[task], pred, average="macro"))
            for cls, r in classification_report(te[task], pred, output_dict=True, zero_division=0).items():
                if isinstance(r, dict) and cls not in ("macro avg", "weighted avg"):
                    per_class.setdefault(cls, []).append(r["f1-score"])
        metrics["tasks"][task] = {
            "macro_f1_baseline_tfidf_lr": [round(float(np.mean(base_f1)), 3), round(float(np.std(base_f1)), 3)],
            "macro_f1_tfidf_char_svm": [round(float(np.mean(main_f1)), 3), round(float(np.std(main_f1)), 3)],
            "per_class_f1": {c: round(float(np.mean(v)), 3) for c, v in per_class.items()},
        }
        joblib.dump(main_model().fit(rows["text"], rows[task]), OUT / f"{task}.joblib")
        print(f"{task:10} baseline {np.mean(base_f1):.3f}  main {np.mean(main_f1):.3f} (+/- {np.std(main_f1):.3f})")
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
