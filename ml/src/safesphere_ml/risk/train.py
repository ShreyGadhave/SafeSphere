"""Train and evaluate ML-1 (area risk) on Chicago, with a time-based split.

Unit of prediction: one H3 cell (res 8) × hour of day × day type (weekday/weekend).
Target: number of street-level incidents in that slot during a year.
Features: within-city percentile OSM features (see osm_features.py) + hour (cyclic) + weekend.

Train on 2023, test on 2024 — the model never sees the year it is scored on.

Models:
  • baseline: Poisson GLM (sklearn PoissonRegressor)
  • main:     XGBoost with a Poisson objective
Metrics (test year):
  • Spearman rank correlation between predicted and actual counts
  • ROC-AUC / PR-AUC for "high-risk slot" = top 10 % of actual counts
  • PAI@5% — Predictive Accuracy Index: share of incidents captured by the 5 % of city area the
    model ranks riskiest, divided by 5 % (1 = random, higher is better)

Usage:  python -m safesphere_ml.risk.train
Output: ml/models/risk/{xgb_risk.json, metrics.json, features.json}
"""

from __future__ import annotations

import json

import h3
import numpy as np
import pandas as pd
import xgboost as xgb
from scipy.stats import spearmanr
from sklearn.linear_model import PoissonRegressor
from sklearn.metrics import average_precision_score, roc_auc_score

from safesphere_ml.common.paths import INTERIM_DIR, MODELS_DIR, RAW_DIR
from safesphere_ml.risk.osm_features import H3_RES, MODEL_FEATURES

RISK_DIR = MODELS_DIR / "risk"
TIME_FEATURES = ["hour_sin", "hour_cos", "weekend"]
FEATURES = MODEL_FEATURES + TIME_FEATURES


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    angle = 2 * np.pi * df["hour"] / 24
    return df.assign(hour_sin=np.sin(angle), hour_cos=np.cos(angle), weekend=(df["day_type"] == "weekend").astype(int))


def slot_grid(cells: pd.DataFrame) -> pd.DataFrame:
    """Every cell × 24 hours × 2 day types."""
    slots = pd.MultiIndex.from_product(
        [cells["h3_index"], range(24), ["weekday", "weekend"]], names=["h3_index", "hour", "day_type"]
    ).to_frame(index=False)
    return add_time_features(slots.merge(cells, on="h3_index"))


def incident_counts(incidents: pd.DataFrame, year: int) -> pd.DataFrame:
    df = incidents[incidents["date"].dt.year == year]
    return (
        df.assign(
            h3_index=[h3.latlng_to_cell(a, b, H3_RES) for a, b in zip(df["lat"], df["lng"], strict=True)],
            hour=df["date"].dt.hour,
            day_type=np.where(df["date"].dt.dayofweek >= 5, "weekend", "weekday"),
        )
        .groupby(["h3_index", "hour", "day_type"])
        .size()
        .rename("count")
        .reset_index()
    )


def with_target(grid: pd.DataFrame, counts: pd.DataFrame) -> pd.DataFrame:
    out = grid.merge(counts, on=["h3_index", "hour", "day_type"], how="left")
    return out.assign(count=out["count"].fillna(0))


def pai(cells: pd.Series, pred: np.ndarray, actual: np.ndarray, area_share: float = 0.05) -> float:
    """PAI over cells: rank cells by total predicted risk, take the top `area_share` of cells."""
    by_cell = pd.DataFrame({"cell": cells.to_numpy(), "pred": pred, "actual": actual}).groupby("cell").sum()
    top = by_cell["pred"].rank(ascending=False, method="first") <= max(1, int(len(by_cell) * area_share))
    hit_rate = by_cell.loc[top, "actual"].sum() / by_cell["actual"].sum()
    return float(hit_rate / area_share)


def evaluate(test: pd.DataFrame, pred: np.ndarray) -> dict[str, float]:
    actual = test["count"].to_numpy()
    high = actual >= np.quantile(actual, 0.90)
    return {
        "spearman": float(spearmanr(pred, actual).statistic),
        "roc_auc_top10": float(roc_auc_score(high, pred)),
        "pr_auc_top10": float(average_precision_score(high, pred)),
        "pai_at_5pct": pai(test["h3_index"], pred, actual),
    }


def main() -> None:
    cells = pd.read_parquet(INTERIM_DIR / "osm_cells_chicago.parquet")
    incidents = pd.read_parquet(RAW_DIR / "chicago_incidents_2023_2024.parquet")
    grid = slot_grid(cells)
    train = with_target(grid, incident_counts(incidents, 2023))
    test = with_target(grid, incident_counts(incidents, 2024))
    print(f"slots per year: {len(grid):,} | incidents 2023: {int(train['count'].sum()):,}, 2024: {int(test['count'].sum()):,}")

    glm = PoissonRegressor(alpha=1e-4, max_iter=1000).fit(train[FEATURES], train["count"])
    model = xgb.XGBRegressor(
        objective="count:poisson", n_estimators=600, learning_rate=0.05, max_depth=6,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=5, tree_method="hist", random_state=17,
    ).fit(train[FEATURES], train["count"])

    metrics = {
        "split": "train 2023 / test 2024, Chicago",
        "unit": "H3 res-8 cell x hour x day type",
        "baseline_poisson_glm": evaluate(test, glm.predict(test[FEATURES])),
        "xgboost_poisson": evaluate(test, model.predict(test[FEATURES])),
    }
    importance = model.get_booster().get_score(importance_type="gain")
    metrics["feature_gain"] = dict(sorted(importance.items(), key=lambda kv: -kv[1]))

    RISK_DIR.mkdir(parents=True, exist_ok=True)
    model.save_model(RISK_DIR / "xgb_risk.json")
    (RISK_DIR / "features.json").write_text(json.dumps(FEATURES, indent=2))
    (RISK_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    for name in ("baseline_poisson_glm", "xgboost_poisson"):
        print(name, {k: round(v, 3) for k, v in metrics[name].items()})
    print("top features:", list(metrics["feature_gain"])[:6])


if __name__ == "__main__":
    main()
