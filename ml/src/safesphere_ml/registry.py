"""Publish every model's version and evaluation metrics to `model_registry` (dashboard H8).

Reads the metrics.json files written by each training script so the dashboard always shows the
numbers the models were actually evaluated with.

Usage:  python -m safesphere_ml.registry
"""

from __future__ import annotations

import json

import psycopg

from safesphere_ml.common.paths import MODELS_DIR
from safesphere_ml.risk.score_cities import database_url

MODELS = [
    ("risk", "risk-xgb-v1", "risk/metrics.json", "risk/xgb_risk.json",
     "ML-1 area risk. XGBoost (Poisson) on OSM percentile features; trained Chicago 2023, tested 2024; "
     "transferred to MMR, Delhi, Pune. Measures incident density (crowded hubs score high)."),
    ("audio", "yamnet-distress-v1", "audio/metrics.json", "audio/yamnet.tflite",
     "ML-3 scream detection on the phone. YAMNet (AudioSet) + Screaming/Shout/Yell score, 2-of-3 vote; "
     "threshold calibrated on ESC-50. Recall to be measured on device recordings."),
    ("motion", "fall-cnn-v1", "motion/metrics.json", "motion/fall_cnn.tflite",
     "ML-4 fall detection on the phone. 1D-CNN on |acc|,|gyro| 4 s windows; UCI simulated falls, "
     "5-fold CV by volunteer. Simulated falls: real-world accuracy will be lower."),
    ("anomaly", "trip-xgb-v1", "anomaly/metrics.json", "anomaly/anomaly_model.json",
     "ML-5 journey anomaly on the phone. XGBoost + 3-fix persistence; 600 simulated cab trips on the "
     "Mumbai OSM graph."),
    ("nlp", "nlp-tfidf-svm-v1", "nlp/metrics.json", "nlp/category.joblib",
     "ML-6 report NLP. Word + char TF-IDF linear SVM for category / urgency / moderation; LLM-drafted "
     "labelled reports, 4-fold stratified group CV."),
]

TRIAGE = (
    "triage", "triage-weights-v1", {"type": "transparent weighted logistic score", "factors": [
        "emergency type", "trigger", "AI confidence", "area risk", "night", "low battery", "duress"]},
    "supabase/migrations/20261017000012_alert_triage.sql",
    "ML-8 alert triage. Documented weights, computed in the database for every alert; the per-factor "
    "breakdown is stored with each alert.",
)


def main() -> None:
    rows = []
    for name, version, metrics_path, artifact, notes in MODELS:
        path = MODELS_DIR / metrics_path
        if not path.exists():
            print(f"skip {name}: {metrics_path} missing")
            continue
        rows.append((name, version, json.loads(path.read_text()), f"ml/models/{artifact}", notes))
    rows.append((TRIAGE[0], TRIAGE[1], TRIAGE[2], TRIAGE[3], TRIAGE[4]))
    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        for name, version, metrics, artifact, notes in rows:
            cur.execute("update public.model_registry set is_active = false where name = %s and version <> %s", (name, version))
            cur.execute(
                "insert into public.model_registry (name, version, metrics, artifact_uri, is_active, notes)"
                " values (%s, %s, %s, %s, true, %s)"
                " on conflict (name, version) do update set metrics = excluded.metrics, artifact_uri = excluded.artifact_uri,"
                " notes = excluded.notes, is_active = true",
                (name, version, json.dumps(metrics), artifact, notes),
            )
            print(f"registered {name} {version}")


if __name__ == "__main__":
    main()
