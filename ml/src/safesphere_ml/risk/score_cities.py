"""Apply the Chicago-trained ML-1 model to the Indian city packs and publish `risk_cells`.

For every street cell × hour × day type:
  • predicted incident rate (XGBoost, Poisson) → `score` = percentile within the city pack (0–100),
    i.e. "riskier than N % of this city's street-hours" — a relative score, as the model was
    transferred from another city (see docs/PLAN.md §6 and the report's limitations section);
  • `reasons` = top 3 SHAP contributions (XGBoost pred_contribs), turned into plain labels with a
    signed relative impact (percent of total contribution).

Mumbai + Navi Mumbai share one pack; each cell is tagged with the app city by longitude
(Navi Mumbai lies east of Thane Creek).

Usage:  python -m safesphere_ml.risk.score_cities mumbai_mmr|delhi|pune|all
Needs:  DATABASE_URL (services/ml-api/.env is read automatically)
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg
import xgboost as xgb

from safesphere_ml.common.cities import CITY_PACKS
from safesphere_ml.common.paths import INTERIM_DIR, ML_ROOT
from safesphere_ml.risk.train import RISK_DIR, slot_grid

MODEL_VERSION = "risk-xgb-v1"
NAVI_MUMBAI_MIN_LNG = 72.98

# feature -> (label when the cell is high on it, label when low)
LABELS: dict[str, tuple[str, str]] = {
    "bus_stops_pct": ("Busy bus corridor", "Few bus stops"),
    "stations_pct": ("Near a rail or metro station", "No station nearby"),
    "food_pct": ("Many eateries nearby", "Few eateries open nearby"),
    "nightlife_pct": ("Bars and nightlife nearby", "No nightlife nearby"),
    "shops_pct": ("Busy market area", "Few shops, quieter streets"),
    "cash_pct": ("ATMs and banks nearby", "Few ATMs or banks"),
    "police_pct": ("Police station in this area", "No police station in this area"),
    "health_pct": ("Hospitals or clinics nearby", "Few hospitals or clinics"),
    "education_pct": ("Schools or colleges nearby", "No schools nearby"),
    "fuel_pct": ("Fuel stations nearby", "No fuel stations nearby"),
    "major_road_km_pct": ("On a major road", "Away from main roads"),
    "minor_road_km_pct": ("Dense lanes", "Few side streets"),
    "intersections_pct": ("Many junctions", "Few junctions"),
    "police_dist_pct": ("Far from a police station", "Close to a police station"),
}


def time_label(hour: int) -> str:
    if hour < 5:
        return "Late night"
    if hour < 7:
        return "Early morning"
    if hour < 18:
        return "Daytime"
    if hour < 21:
        return "Evening"
    return "Night"


def app_city(pack: str, lng: float) -> str:
    if pack == "mumbai_mmr":
        return "navi_mumbai" if lng >= NAVI_MUMBAI_MIN_LNG else "mumbai"
    return pack


def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    env_file = ML_ROOT.parent / "services" / "ml-api" / ".env"
    for line in Path(env_file).read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("DATABASE_URL not set")


def reasons_for(row_contrib: np.ndarray, row: pd.Series, features: list[str]) -> list[dict]:
    contrib = dict(zip(features, row_contrib, strict=True))
    items: list[tuple[str, str, float]] = []
    time_c = contrib.pop("hour_sin") + contrib.pop("hour_cos")
    items.append(("time", time_label(int(row["hour"])), time_c))
    items.append(("day_type", "Weekend" if row["weekend"] else "Weekday", contrib.pop("weekend")))
    for feat, c in contrib.items():
        high, low = LABELS[feat]
        items.append((feat, high if row[feat] >= 0.5 else low, c))
    total = sum(abs(c) for _, _, c in items) or 1.0
    top = sorted(items, key=lambda t: -abs(t[2]))[:3]
    return [{"feature": f, "label": label, "impact": round(100 * c / total)} for f, label, c in top]


def score_pack(pack: str, model: xgb.Booster, features: list[str]) -> pd.DataFrame:
    cells = pd.read_parquet(INTERIM_DIR / f"osm_cells_{pack}.parquet")
    grid = slot_grid(cells)
    dm = xgb.DMatrix(grid[features])
    pred = model.predict(dm)
    contribs = model.predict(dm, pred_contribs=True)[:, :-1]  # last column is the bias
    grid["score"] = (pd.Series(pred).rank(pct=True) * 100).round(1).to_numpy()
    grid["reasons"] = [json.dumps(reasons_for(contribs[i], grid.iloc[i], features)) for i in range(len(grid))]
    grid["city"] = [app_city(pack, lng) for lng in grid["lng"]]
    return grid


def publish(pack: str, scored: pd.DataFrame) -> None:
    cities = sorted(scored["city"].unique())
    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        cur.execute("delete from public.risk_cells where city = any(%s::public.city[])", (cities,))
        with cur.copy(
            "copy public.risk_cells (h3_index, day_type, hour, city, centroid, score, reasons, model_version)"
            " from stdin"
        ) as copy:
            for r in scored.itertuples(index=False):
                copy.write_row(
                    (r.h3_index, r.day_type, int(r.hour), r.city, f"SRID=4326;POINT({r.lng} {r.lat})",
                     float(r.score), r.reasons, MODEL_VERSION)
                )
    print(f"[{pack}] published {len(scored):,} rows for {', '.join(cities)}")


def register_model() -> None:
    metrics = json.loads((RISK_DIR / "metrics.json").read_text())
    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        cur.execute("update public.model_registry set is_active = false where name = 'risk'")
        cur.execute(
            "insert into public.model_registry (name, version, metrics, artifact_uri, is_active, notes)"
            " values ('risk', %s, %s, 'ml/models/risk/xgb_risk.json', true, %s)"
            " on conflict (name, version) do update set metrics = excluded.metrics, is_active = true",
            (MODEL_VERSION, json.dumps(metrics),
             "XGBoost Poisson on OSM percentile features; trained on Chicago 2023, tested 2024; "
             "transferred to MMR, Delhi, Pune as within-city relative risk."),
        )


def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    packs = CITY_PACKS if arg == "all" else (arg,)
    model = xgb.Booster()
    model.load_model(RISK_DIR / "xgb_risk.json")
    features = json.loads((RISK_DIR / "features.json").read_text())
    for pack in packs:
        scored = score_pack(pack, model, features)
        # Compact copy for the routing service (ML-2), so routing never depends on the database.
        scored[["h3_index", "hour", "day_type", "score", "reasons"]].to_parquet(RISK_DIR / f"scores_{pack}.parquet", index=False)
        publish(pack, scored)
    register_model()
    print("model registered:", MODEL_VERSION)


if __name__ == "__main__":
    main()
