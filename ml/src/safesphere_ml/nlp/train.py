"""ML-6 community report NLP: category, urgency and moderation (spam / abusive) classifiers.

Data: LLM-drafted labelled reports (generate_reports.py) in English, Hinglish and Roman Hindi.
Split: whole generation batches are held out (GroupShuffleSplit), so near-duplicate posts from
the same batch never appear in both train and test.

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
from sklearn.model_selection import GroupShuffleSplit
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
    tr_idx, te_idx = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=5).split(df, groups=df["group"]))
    train, test = df.iloc[tr_idx], df.iloc[te_idx]

    tasks = {
        "category": (train[train["moderation"] == "ok"], test[test["moderation"] == "ok"]),
        "urgency": (train[train["moderation"] == "ok"], test[test["moderation"] == "ok"]),
        "moderation": (train, test),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    metrics: dict = {"data": f"{len(df)} LLM-drafted reports (English / Hinglish / Roman Hindi); held-out batches", "tasks": {}}
    for task, (tr, te) in tasks.items():
        base = baseline().fit(tr["text"], tr[task])
        model = main_model().fit(tr["text"], tr[task])
        f1_base = f1_score(te[task], base.predict(te["text"]), average="macro")
        f1_main = f1_score(te[task], model.predict(te["text"]), average="macro")
        metrics["tasks"][task] = {
            "train": len(tr),
            "test": len(te),
            "macro_f1_baseline_tfidf_lr": round(float(f1_base), 3),
            "macro_f1_tfidf_char_svm": round(float(f1_main), 3),
            "per_class": classification_report(te[task], model.predict(te["text"]), output_dict=True, zero_division=0),
        }
        final = main_model().fit(df.loc[df.index.isin(tr.index.union(te.index)), "text"], df.loc[df.index.isin(tr.index.union(te.index)), task])
        joblib.dump(final, OUT / f"{task}.joblib")
        print(f"{task:10} baseline {f1_base:.3f}  main {f1_main:.3f}  (train {len(tr)}, test {len(te)})")
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
