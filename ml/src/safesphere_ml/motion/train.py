"""ML-4 fall detection from phone-like motion sensors.

Data: UCI "Simulated Falls and Daily Living Activities" (Özdemir & Barshan, 17 volunteers,
20 fall types 9xx + 16 daily activities 8xx, Xsens MTw sensors at 25 Hz). We use the waist and
right-thigh sensors — the thigh is where a phone in a trouser pocket sits.

Input: 4 s windows (100 samples) of orientation-free signals [|acc| in g, |gyro| in rad/s], so the
model does not care how the phone is held. Fall windows are centred on the impact (peak |acc|);
daily-activity windows slide over each recording (stumbling, sitting down hard and lying down
are the hard negatives).

Evaluation: 5-fold cross-validation grouped by volunteer (test people are never seen in training).
Models: Random Forest on 14 hand-crafted features (baseline) vs a small 1D-CNN on the raw window.
The CNN is retrained on everyone and exported to TFLite for the phone.

Usage:  python -m safesphere_ml.motion.train
Output: ml/models/motion/{fall_cnn.tflite, fall_config.json, metrics.json}
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, roc_auc_score
from sklearn.model_selection import GroupKFold

from safesphere_ml.common.paths import MODELS_DIR, RAW_DIR

DATA = RAW_DIR / "uci_falls" / "Tests"
OUT = MODELS_DIR / "motion"
SENSORS = {"340535": "waist", "340539": "thigh"}
HZ = 25
WIN = 100  # 4 s
STRIDE = 50  # 2 s between daily-activity windows
G = 9.80665
ACC_CLIP_G = 16.0


def read_sensor(path: Path) -> np.ndarray | None:
    df = pd.read_csv(path, sep="\t", skiprows=4, usecols=["Acc_X", "Acc_Y", "Acc_Z", "Gyr_X", "Gyr_Y", "Gyr_Z"])
    # Sensor files contain short gaps (NaN); fill them so they cannot poison training.
    df = df.interpolate(limit_direction="both")
    if len(df) < WIN or df.isna().any().any():
        return None
    # Phone accelerometers saturate around 16 g; the Xsens files have rare glitches far above it.
    acc = np.clip(np.linalg.norm(df[["Acc_X", "Acc_Y", "Acc_Z"]].to_numpy(), axis=1) / G, 0, ACC_CLIP_G)
    gyr = np.linalg.norm(df[["Gyr_X", "Gyr_Y", "Gyr_Z"]].to_numpy(), axis=1)
    return np.stack([acc, gyr], axis=1).astype(np.float32)


def windows_for(signal: np.ndarray, is_fall: bool) -> list[np.ndarray]:
    if is_fall:
        peak = int(np.argmax(signal[:, 0]))
        start = int(np.clip(peak - WIN // 2, 0, len(signal) - WIN))
        return [signal[start : start + WIN]]
    return [signal[s : s + WIN] for s in range(0, len(signal) - WIN + 1, STRIDE)]


def load() -> tuple[np.ndarray, np.ndarray, np.ndarray, list[str]]:
    X, y, groups, acts = [], [], [], []
    for subject in sorted(p for p in DATA.iterdir() if p.is_dir()):
        for activity in sorted((subject / "Testler Export").iterdir()):
            is_fall = activity.name.startswith("9")
            for trial in activity.iterdir():
                for sensor_id in SENSORS:
                    f = trial / f"{sensor_id}.txt"
                    if not f.exists():
                        continue
                    sig = read_sensor(f)
                    if sig is None:
                        continue
                    for w in windows_for(sig, is_fall):
                        X.append(w)
                        y.append(int(is_fall))
                        groups.append(subject.name)
                        acts.append(activity.name)
    return np.stack(X), np.array(y), np.array(groups), acts


def features(X: np.ndarray) -> np.ndarray:
    acc, gyr = X[:, :, 0], X[:, :, 1]
    peak = acc.argmax(axis=1)
    after = np.array([a[min(p + 25, WIN - 1) :].std() if p + 25 < WIN else 0.0 for a, p in zip(acc, peak, strict=True)])
    return np.column_stack([
        acc.mean(1), acc.std(1), acc.max(1), acc.min(1), acc.max(1) - acc.min(1),
        gyr.mean(1), gyr.std(1), gyr.max(1),
        np.abs(np.diff(acc, axis=1)).max(1),  # jerk
        peak / WIN, after,  # post-impact stillness
        (acc < 0.6).sum(1), (acc > 2.0).sum(1),  # free-fall / impact samples
        np.percentile(acc, 90, axis=1),
    ])


def build_cnn(X_train: np.ndarray):
    import tensorflow as tf

    norm = tf.keras.layers.Normalization(axis=-1)
    norm.adapt(X_train.reshape(-1, 2))
    model = tf.keras.Sequential([
        tf.keras.layers.Input((WIN, 2)),
        norm,
        tf.keras.layers.Conv1D(32, 7, activation="relu", padding="same"),
        tf.keras.layers.MaxPooling1D(2),
        tf.keras.layers.Conv1D(64, 5, activation="relu", padding="same"),
        tf.keras.layers.MaxPooling1D(2),
        tf.keras.layers.Conv1D(64, 3, activation="relu", padding="same"),
        tf.keras.layers.GlobalAveragePooling1D(),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dense(1, activation="sigmoid"),
    ])
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="binary_crossentropy")
    return model


def scores(y: np.ndarray, p: np.ndarray, threshold: float = 0.5) -> dict[str, float]:
    pred = p >= threshold
    tp, tn = int((pred & (y == 1)).sum()), int((~pred & (y == 0)).sum())
    return {
        "sensitivity": tp / max(1, int((y == 1).sum())),
        "specificity": tn / max(1, int((y == 0).sum())),
        "f1": float(f1_score(y, pred)),
        "roc_auc": float(roc_auc_score(y, p)),
    }


def main() -> None:
    import tensorflow as tf

    tf.keras.utils.set_random_seed(7)
    X, y, groups, _ = load()
    print(f"windows: {len(X):,} (falls {int(y.sum()):,}, daily {int((y == 0).sum()):,}) from {len(set(groups))} volunteers")
    pos_weight = (y == 0).sum() / max(1, y.sum())

    folds = {"random_forest": [], "cnn": []}
    oof_cnn = np.zeros(len(y))
    for k, (tr, te) in enumerate(GroupKFold(n_splits=5).split(X, y, groups)):
        rf = RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=7, n_jobs=-1)
        rf.fit(features(X[tr]), y[tr])
        folds["random_forest"].append(scores(y[te], rf.predict_proba(features(X[te]))[:, 1]))

        cnn = build_cnn(X[tr])
        cnn.fit(X[tr], y[tr], epochs=25, batch_size=64, verbose=0, class_weight={0: 1.0, 1: float(pos_weight)})
        p = cnn.predict(X[te], verbose=0).ravel()
        oof_cnn[te] = p
        folds["cnn"].append(scores(y[te], p))
        print(f"fold {k + 1}: RF {folds['random_forest'][-1]['f1']:.3f}  CNN {folds['cnn'][-1]['f1']:.3f}")

    summary = {
        name: {m: (round(float(np.mean([f[m] for f in fs])), 4), round(float(np.std([f[m] for f in fs])), 4)) for m in fs[0]}
        for name, fs in folds.items()
    }
    # Phone threshold: highest specificity while keeping sensitivity >= 0.95 on held-out people.
    candidates = [(t, scores(y, oof_cnn, t)) for t in np.arange(0.3, 0.96, 0.05)]
    ok = [(t, s) for t, s in candidates if s["sensitivity"] >= 0.95] or candidates
    threshold, at = max(ok, key=lambda ts: ts[1]["specificity"])

    final = build_cnn(X)
    final.fit(X, y, epochs=25, batch_size=64, verbose=0, class_weight={0: 1.0, 1: float(pos_weight)})
    OUT.mkdir(parents=True, exist_ok=True)
    tflite = tf.lite.TFLiteConverter.from_keras_model(final).convert()
    (OUT / "fall_cnn.tflite").write_bytes(tflite)
    (OUT / "fall_config.json").write_text(json.dumps({
        "model": "fall_cnn.tflite", "sample_rate_hz": HZ, "window_samples": WIN,
        "channels": ["acc_magnitude_g", "gyro_magnitude_rad_s"], "threshold": round(float(threshold), 2),
        "impact_gate_g": 1.8,
    }, indent=2))
    metrics = {
        "dataset": "UCI Simulated Falls and Daily Living Activities (17 volunteers; waist + thigh sensors)",
        "evaluation": "5-fold GroupKFold by volunteer, mean (std)",
        "windows": {"total": int(len(y)), "falls": int(y.sum()), "daily": int((y == 0).sum())},
        "cross_validation": summary,
        "phone_threshold": {"threshold": round(float(threshold), 2), **{k: round(v, 4) for k, v in at.items()}},
        "tflite_bytes": len(tflite),
    }
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics["cross_validation"], indent=1))
    print("phone threshold:", metrics["phone_threshold"], "| tflite", len(tflite), "bytes")


if __name__ == "__main__":
    main()
