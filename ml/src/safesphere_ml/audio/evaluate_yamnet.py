"""ML-3 scream / distress detection: YAMNet transfer + calibrated decision rule.

Model: YAMNet (MobileNet-v1, trained by Google on AudioSet's 521 classes, which include
Screaming, Shout, Yell and Crying). We run the official TFLite export on 0.975 s windows of 16 kHz
audio every 0.5 s and turn its class scores into one *distress score*:

    distress = max(Screaming, Shout, Yell, CRY_WEIGHT · max(Crying/sobbing, Wail/moan))

CRY_WEIGHT is 0: calibration showed every ESC-50 false alarm came from "crying baby" through the
crying classes, while Screaming/Shout/Yell alone gave zero false alarms at threshold 0.30. Crying on
its own therefore does not start an SOS check.

Decision rule (temporal smoothing): trigger when `distress ≥ threshold` in at least K of the last
N windows. On a trigger the app never sends an SOS directly — it shows the 10 s "Are you OK?"
check (PLAN §3.3), so the operating point trades recall against false *prompts* per hour.

Calibration data: ESC-50 (2,000 five-second everyday sounds = 2.78 h, CC BY-NC) contains no
screams, so every trigger on it is a false alarm. We sweep the threshold and pick the lowest one
that keeps false prompts ≤ TARGET_FA_PER_HOUR. Recall must be measured on real distress audio
recorded on the device (see ml/README.md, "Collecting test screams").

Usage:  python -m safesphere_ml.audio.evaluate_yamnet
Output: ml/models/audio/{yamnet.tflite, distress_config.json, metrics.json}
"""

from __future__ import annotations

import json
import shutil
import wave
from collections import Counter

import numpy as np
import pandas as pd
from scipy.signal import resample_poly

from safesphere_ml.common.paths import MODELS_DIR, RAW_DIR

AUDIO_RAW = RAW_DIR / "audio"
ESC50 = AUDIO_RAW / "ESC-50-master"
OUT_DIR = MODELS_DIR / "audio"

SAMPLE_RATE = 16_000
WINDOW = 15_600  # YAMNet input: 0.975 s
HOP = 8_000  # 0.5 s
PRIMARY = {"Screaming": 11, "Shout": 6, "Yell": 9}
SECONDARY = {"Crying, sobbing": 19, "Wail, moan": 22}
CRY_WEIGHT = 0.0
K_OF_N = (2, 3)
TARGET_FA_PER_HOUR = 1.0


def load_interpreter():
    try:
        from ai_edge_litert.interpreter import Interpreter
    except ImportError:  # fall back to TF's bundled interpreter
        import tensorflow as tf

        Interpreter = tf.lite.Interpreter
    interp = Interpreter(model_path=str(AUDIO_RAW / "yamnet.tflite"))
    interp.allocate_tensors()
    return interp


def read_wav_16k(path) -> np.ndarray:
    with wave.open(str(path)) as w:
        rate, width, channels = w.getframerate(), w.getsampwidth(), w.getnchannels()
        raw = w.readframes(w.getnframes())
    dtype = {1: np.uint8, 2: np.int16, 4: np.int32}[width]
    x = np.frombuffer(raw, dtype=dtype).astype(np.float32)
    if channels > 1:
        x = x.reshape(-1, channels).mean(axis=1)
    x /= float(np.iinfo(dtype).max)
    if rate != SAMPLE_RATE:
        g = np.gcd(rate, SAMPLE_RATE)
        x = resample_poly(x, SAMPLE_RATE // g, rate // g).astype(np.float32)
    return x


def distress_scores(interp, audio: np.ndarray) -> np.ndarray:
    """Distress score for every 0.5 s hop of a clip."""
    inp, out = interp.get_input_details()[0]["index"], interp.get_output_details()[0]["index"]
    if len(audio) < WINDOW:
        audio = np.pad(audio, (0, WINDOW - len(audio)))
    scores = []
    for start in range(0, len(audio) - WINDOW + 1, HOP):
        interp.set_tensor(inp, audio[start : start + WINDOW])
        interp.invoke()
        s = interp.get_tensor(out)[0]
        primary = max(s[i] for i in PRIMARY.values())
        secondary = CRY_WEIGHT * max(s[i] for i in SECONDARY.values())
        scores.append(max(primary, secondary))
    return np.array(scores)


def triggers(scores: np.ndarray, threshold: float) -> int:
    """Number of distinct triggers under the K-of-N rule (re-arms after N quiet windows)."""
    k, n = K_OF_N
    hits = scores >= threshold
    count, cooldown = 0, 0
    for i in range(len(hits)):
        if cooldown:
            cooldown -= 1
            continue
        if hits[max(0, i - n + 1) : i + 1].sum() >= k:
            count += 1
            cooldown = n
    return count


def main() -> None:
    meta = pd.read_csv(ESC50 / "meta" / "esc50.csv")
    interp = load_interpreter()
    per_clip = {row.filename: distress_scores(interp, read_wav_16k(ESC50 / "audio" / row.filename)) for row in meta.itertuples()}
    hours = len(meta) * 5 / 3600

    sweep = []
    for threshold in np.round(np.arange(0.05, 0.96, 0.05), 2):
        fa = sum(triggers(s, threshold) for s in per_clip.values())
        sweep.append({"threshold": float(threshold), "false_prompts": fa, "per_hour": round(fa / hours, 2)})
    chosen = next((r for r in sweep if r["per_hour"] <= TARGET_FA_PER_HOUR), sweep[-1])

    by_category = Counter()
    for row in meta.itertuples():
        if triggers(per_clip[row.filename], chosen["threshold"]):
            by_category[row.category] += 1
    peak = pd.Series({f: s.max() for f, s in per_clip.items()})
    top_categories = (
        meta.assign(peak=meta["filename"].map(peak)).groupby("category")["peak"].mean().sort_values(ascending=False).head(5)
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy(AUDIO_RAW / "yamnet.tflite", OUT_DIR / "yamnet.tflite")
    config = {
        "model": "yamnet.tflite",
        "sample_rate": SAMPLE_RATE,
        "window_samples": WINDOW,
        "hop_samples": HOP,
        "primary_classes": PRIMARY,
        "secondary_classes": SECONDARY,
        "secondary_weight": CRY_WEIGHT,
        "k_of_n": list(K_OF_N),
        "threshold": chosen["threshold"],
    }
    metrics = {
        "calibration_set": "ESC-50 (2,000 clips, 2.78 h, no screams)",
        "target_false_prompts_per_hour": TARGET_FA_PER_HOUR,
        "chosen": chosen,
        "sweep": sweep,
        "triggering_categories_at_threshold": dict(by_category.most_common()),
        "highest_mean_peak_categories": top_categories.round(3).to_dict(),
    }
    (OUT_DIR / "distress_config.json").write_text(json.dumps(config, indent=2))
    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print("chosen operating point:", chosen)
    print("sweep:", [(r["threshold"], r["per_hour"]) for r in sweep])
    print("false prompts by category:", dict(by_category.most_common(6)))
    print("closest everyday sounds:", top_categories.round(3).to_dict())


if __name__ == "__main__":
    main()
