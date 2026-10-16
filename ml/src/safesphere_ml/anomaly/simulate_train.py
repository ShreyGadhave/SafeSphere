"""ML-5 journey anomaly detection — simulated cab trips on the real Mumbai road graph.

No open GPS dataset of Indian cab trips exists, so we simulate them on the OSM drive graph
(ml/models/routing/mumbai_mmr_drive.npz) and say so in the report:
  • normal trips: shortest route or a legitimate alternative, speeds 4-12 m/s, traffic stops
    (20-120 s), GPS noise sigma 6-15 m, a fix every 10 s;
  • anomalies (from a random onset after 25-70 % of the trip): detour to a point 1-3 km off
    route, an unexplained stop of 5-15 min, or driving away from the destination.

Per fix we compute the features the phone sees (deviation from the expected routes, change in
distance to destination over 60/180 s, stopped duration, speed, time vs plan) and compare:
  • rules     — the on-device rules in apps/mobile/src/features/ride/services/anomaly.ts
  • iforest   — Isolation Forest trained on normal trips only (unsupervised)
  • xgboost   — supervised on labelled fixes
Metrics on held-out trips: detection rate, false alarms per normal trip, median detection delay.

Usage:  python -m safesphere_ml.anomaly.simulate_train
Output: ml/models/anomaly/{xgb_anomaly.json, metrics.json}
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
import xgboost as xgb
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra
from sklearn.ensemble import IsolationForest

from safesphere_ml.common.paths import MODELS_DIR

GRAPH = MODELS_DIR / "routing" / "mumbai_mmr_drive.npz"
OUT = MODELS_DIR / "anomaly"
STEP_S = 10
RNG = np.random.default_rng(11)
M_PER_DEG = 111_320.0

FEATURES = ["dev_m", "dev_max_30s", "away_60s", "away_180s", "stopped_s", "speed", "time_ratio", "progress"]


class Graph:
    def __init__(self):
        d = np.load(GRAPH)
        self.lat, self.lng = d["lat"], d["lng"]
        self.u, self.v, self.len = d["u"], d["v"], d["length"].astype(float)
        n = len(self.lat)
        self.base = csr_matrix((self.len, (self.u, self.v)), shape=(n, n))
        self.n = n

    def xy(self, nodes):
        lat0 = np.radians(19.07)
        return np.c_[self.lng[nodes] * M_PER_DEG * np.cos(lat0), self.lat[nodes] * M_PER_DEG]

    def path(self, src: int, dst: int, weights=None) -> list[int] | None:
        g = self.base if weights is None else csr_matrix((weights, (self.u, self.v)), shape=(self.n, self.n))
        dist, pred = dijkstra(g, indices=src, return_predecessors=True)
        if not np.isfinite(dist[dst]):
            return None
        p = [dst]
        while p[-1] != src:
            p.append(int(pred[p[-1]]))
        return p[::-1]

    def alternative(self, path: list[int], src: int, dst: int) -> list[int] | None:
        used = set(zip(path, path[1:], strict=False))
        w = np.array([ln * (2.0 if (a, b) in used else 1.0) for a, b, ln in zip(self.u, self.v, self.len, strict=True)])
        return self.path(src, dst, w)


def densify(xy: np.ndarray, step_m: float = 5.0) -> np.ndarray:
    out = [xy[0]]
    for a, b in zip(xy, xy[1:], strict=False):
        n = max(1, int(np.linalg.norm(b - a) // step_m))
        out.extend(a + (b - a) * (i / n) for i in range(1, n + 1))
    return np.array(out)


def drive(poly: np.ndarray, speed: float, stops: bool) -> np.ndarray:
    """Positions every STEP_S seconds along a polyline, with random traffic stops."""
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(poly, axis=0), axis=1))]
    out, s = [], 0.0
    while s < seg[-1]:
        i = min(np.searchsorted(seg, s), len(poly) - 1)
        out.append(poly[i])
        if stops and RNG.random() < 0.06:
            out.extend([poly[i]] * int(RNG.integers(2, 12)))  # 20-120 s at a signal / jam
        s += speed * STEP_S * RNG.uniform(0.6, 1.3)
    out.append(poly[-1])
    return np.array(out)


def point_dev(p: np.ndarray, routes: list[np.ndarray]) -> float:
    return min(float(np.min(np.linalg.norm(r - p, axis=1))) for r in routes)


def features_for(track: np.ndarray, routes: list[np.ndarray], dest: np.ndarray, planned_s: float) -> pd.DataFrame:
    dev = np.array([point_dev(p, routes) for p in track])
    to_dest = np.linalg.norm(track - dest, axis=1)
    total = max(1.0, to_dest[0])
    rows, stopped = [], 0
    for i in range(len(track)):
        stopped = stopped + STEP_S if i and np.linalg.norm(track[i] - track[i - 1]) < 15 else 0
        rows.append({
            "dev_m": dev[i],
            "dev_max_30s": dev[max(0, i - 3) : i + 1].min(),  # off route for the whole last 30 s
            "away_60s": to_dest[i] - to_dest[max(0, i - 6)],
            "away_180s": to_dest[i] - to_dest[max(0, i - 18)],
            "stopped_s": stopped,
            "speed": np.linalg.norm(track[i] - track[i - 1]) / STEP_S if i else 0.0,
            "time_ratio": i * STEP_S / max(60.0, planned_s),
            "progress": 1 - to_dest[i] / total,
        })
    return pd.DataFrame(rows)


def simulate(g: Graph, n_trips: int) -> pd.DataFrame:
    frames, made = [], 0
    while made < n_trips:
        src, dst = RNG.integers(0, g.n, 2)
        crow = np.linalg.norm(g.xy([src])[0] - g.xy([dst])[0])
        if not 3_000 < crow < 12_000:
            continue
        main = g.path(src, dst)
        if not main or len(main) < 10:
            continue
        alt = g.alternative(main, src, dst) or main
        routes = [densify(g.xy(main)), densify(g.xy(alt))]
        dest = g.xy([dst])[0]
        speed = RNG.uniform(4, 12)
        kind = RNG.choice(["normal", "detour", "stop", "away"], p=[0.5, 0.2, 0.15, 0.15])
        taken = routes[int(RNG.random() < 0.3)]  # sometimes the legitimate alternative
        track = drive(taken, speed, stops=True)
        onset = None
        if kind != "normal":
            k = int(len(track) * RNG.uniform(0.25, 0.7))
            onset, here = k, track[k]
            if kind == "stop":
                track = np.vstack([track[: k + 1], np.repeat(track[k : k + 1], int(RNG.integers(30, 90)), axis=0)])
            else:
                angle = RNG.uniform(0, 2 * np.pi)
                to_dest = dest - here
                if kind == "away":  # head roughly opposite to the destination
                    angle = np.arctan2(-to_dest[1], -to_dest[0]) + RNG.normal(0, 0.4)
                target = here + RNG.uniform(1_000, 3_000) * np.array([np.cos(angle), np.sin(angle)])
                tnode = int(np.argmin(np.linalg.norm(g.xy(np.arange(g.n)) - target, axis=1)))
                hnode = int(np.argmin(np.linalg.norm(g.xy(np.arange(g.n)) - here, axis=1)))
                leg = g.path(hnode, tnode)
                if not leg:
                    continue
                track = np.vstack([track[: k + 1], drive(densify(g.xy(leg)), speed, stops=False)])
        noisy = track + RNG.normal(0, RNG.uniform(6, 15), track.shape)
        f = features_for(noisy, routes, dest, planned_s=routes[0].shape[0] * 5 / speed)
        f["trip"] = made
        f["kind"] = kind
        f["label"] = 0 if onset is None else (np.arange(len(f)) >= onset + 3).astype(int)  # 30 s grace
        f["onset"] = -1 if onset is None else onset
        frames.append(f)
        made += 1
    return pd.concat(frames, ignore_index=True)


def rules(df: pd.DataFrame) -> np.ndarray:
    """The phone's rules (anomaly.ts) on the same features."""
    off = (df["dev_max_30s"] > 150) & (df["away_60s"] > 0)
    stop = (df["stopped_s"] >= 240) & (df["progress"] < 0.95)
    away = df["away_180s"] > 500
    return (off | stop | away).to_numpy().astype(float)


def trip_metrics(df: pd.DataFrame, alarm: np.ndarray) -> dict[str, float]:
    df = df.assign(alarm=alarm)
    detected, delays, false_trips, false_alarms = 0, [], 0, 0
    anomalous = df[df["kind"] != "normal"].groupby("trip")
    normal = df[df["kind"] == "normal"].groupby("trip")
    for _, t in anomalous:
        onset = int(t["onset"].iloc[0])
        hits = np.flatnonzero(t["alarm"].to_numpy()[onset:])
        if len(hits):
            detected += 1
            delays.append(hits[0] * STEP_S)
    for _, t in normal:
        n = int((np.diff(np.r_[0, t["alarm"].to_numpy()]) > 0).sum())  # alarm onsets
        false_alarms += n
        false_trips += int(n > 0)
    return {
        "detection_rate": detected / max(1, anomalous.ngroups),
        "false_alarm_trips": false_trips / max(1, normal.ngroups),
        "false_alarms_per_trip": false_alarms / max(1, normal.ngroups),
        "median_delay_s": float(np.median(delays)) if delays else float("nan"),
    }


def persistent(df: pd.DataFrame, prob: np.ndarray, threshold: float, k: int) -> np.ndarray:
    """Alarm only after `k` consecutive fixes (k x 10 s) above `threshold`, per trip."""
    out = np.zeros(len(df))
    above = prob >= threshold
    for _, idx in df.groupby("trip").indices.items():
        run = 0
        for i in idx:
            run = run + 1 if above[i] else 0
            out[i] = float(run >= k)
    return out


def export_for_phone(model: xgb.XGBClassifier, threshold: float, k: int, sample: pd.DataFrame, sample_prob) -> None:
    """Compact tree arrays the app evaluates in JS (+ fixtures so a unit test can check parity)."""
    booster = model.get_booster()
    cfg = json.loads(booster.save_config())["learner"]["learner_model_param"]["base_score"]
    base = float(str(cfg).strip("[]"))
    trees = []
    df = booster.trees_to_dataframe()
    for _, t in df.groupby("Tree"):
        t = t.sort_values("Node")
        ids = {nid: i for i, nid in enumerate(t["ID"])}
        leaf = t["Feature"] == "Leaf"
        trees.append({
            "f": [-1 if lf else FEATURES.index(f) for f, lf in zip(t["Feature"], leaf, strict=True)],
            "t": [0.0 if lf else float(x) for x, lf in zip(t["Split"], leaf, strict=True)],
            "y": [-1 if lf else ids[y] for y, lf in zip(t["Yes"], leaf, strict=True)],
            "n": [-1 if lf else ids[n] for n, lf in zip(t["No"], leaf, strict=True)],
            "m": [-1 if lf else ids[m] for m, lf in zip(t["Missing"], leaf, strict=True)],
            "v": [float(g) if lf else 0.0 for g, lf in zip(t["Gain"], leaf, strict=True)],
        })
    phone = {"features": FEATURES, "base_margin": float(np.log(base / (1 - base))), "threshold": threshold,
             "persist_fixes": k, "trees": trees}
    (OUT / "anomaly_model.json").write_text(json.dumps(phone, separators=(",", ":")))
    fixture = {"rows": sample.round(4).to_numpy().tolist(), "prob": [round(float(p), 5) for p in sample_prob]}
    (OUT / "anomaly_fixture.json").write_text(json.dumps(fixture))


def main() -> None:
    g = Graph()
    data = simulate(g, 600)
    trips = data["trip"].unique()
    test_trips = set(RNG.choice(trips, size=len(trips) // 4, replace=False))
    test = data[data["trip"].isin(test_trips)]
    train = data[~data["trip"].isin(test_trips)]
    print(f"simulated {len(trips)} trips, {len(data):,} fixes; kinds: {data.groupby('trip')['kind'].first().value_counts().to_dict()}")

    iforest = IsolationForest(n_estimators=300, contamination=0.02, random_state=11)
    iforest.fit(train[train["kind"] == "normal"][FEATURES])
    model = xgb.XGBClassifier(n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.8, random_state=11)
    model.fit(train[FEATURES], train["label"])

    results = {
        "rules (on phone)": trip_metrics(test, rules(test)),
        "isolation_forest": trip_metrics(test, (iforest.predict(test[FEATURES]) == -1).astype(float)),
        "xgboost": trip_metrics(test, (model.predict_proba(test[FEATURES])[:, 1] >= 0.5).astype(float)),
    }
    prob = model.predict_proba(test[FEATURES])[:, 1]
    sweep = {(t, k): trip_metrics(test, persistent(test, prob, t, k)) for t in (0.5, 0.7, 0.9) for k in (2, 3, 4)}
    # Operating point: highest detection with at most 5 % of normal trips raising any alarm.
    ok = {key: r for key, r in sweep.items() if r["false_alarm_trips"] <= 0.05} or sweep
    (t_best, k_best), best = max(ok.items(), key=lambda kv: (kv[1]["detection_rate"], -kv[1]["median_delay_s"]))
    results[f"xgboost + persistence (p>={t_best}, {k_best} fixes)"] = best
    OUT.mkdir(parents=True, exist_ok=True)
    model.save_model(OUT / "xgb_anomaly.json")
    export_for_phone(model, t_best, k_best, test[FEATURES].head(200), prob[:200])
    metrics = {
        "data": "600 simulated cab trips on the Mumbai OSM drive graph (25% held out by trip)",
        "features": FEATURES,
        "results": {k: {m: round(v, 3) for m, v in r.items()} for k, r in results.items()},
    }
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))
    for name, r in metrics["results"].items():
        print(f"{name:18} {r}")


if __name__ == "__main__":
    main()
