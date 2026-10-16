"""ML-1 area risk prediction — serving.

Scores are precomputed offline by `ml/src/safesphere_ml/risk/score_cities.py` for every street
cell x hour x day type and saved to MODEL_DIR/risk/scores_<pack>.parquet (also published to the
`risk_cells` table for the app's heatmap). Serving is a lookup: (lat, lng) → H3 cell → score and
its SHAP reasons. Locations outside the covered cities raise LookupError.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import h3
import pandas as pd

from app.schemas.common import Reason
from app.schemas.risk import RiskRequest, RiskResponse

H3_RES = 8
IST = ZoneInfo("Asia/Kolkata")
MODEL_VERSION = "risk-xgb-v1"


def level_for(score: float) -> str:
    return "high" if score >= 75 else "medium" if score >= 45 else "low"


def now_slot(hour: int | None = None, at: datetime | None = None) -> tuple[int, str]:
    at = at or datetime.now(IST)
    return (at.hour if hour is None else hour), ("weekend" if at.weekday() >= 5 else "weekday")


class RiskStore:
    """All packs' scores in one indexed frame: (h3_index, day_type, hour) -> score, reasons."""

    def __init__(self, risk_dir: Path):
        files = sorted(risk_dir.glob("scores_*.parquet"))
        if not files:
            raise FileNotFoundError(f"no risk score files in {risk_dir}; run the ML-1 pipeline first")
        self.table = (
            pd.concat([pd.read_parquet(f) for f in files])
            .set_index(["h3_index", "day_type", "hour"])
            .sort_index()
        )

    def score(self, cell: str, day_type: str, hour: int) -> tuple[float, list[dict]] | None:
        try:
            row = self.table.loc[(cell, day_type, hour)]
        except KeyError:
            return None
        return float(row["score"]), json.loads(row["reasons"])

    def scores_for_cells(self, cells, day_type: str, hour: int) -> pd.Series:
        """Score per cell for one time slot (NaN where the cell has no street data)."""
        slot = self.table.xs((day_type, hour), level=("day_type", "hour"))["score"]
        return slot.reindex(cells)


class RiskService:
    def __init__(self, store: RiskStore):
        self.store = store

    def score(self, request: RiskRequest) -> RiskResponse:
        hour, day_type = now_slot(request.hour)
        cell = h3.latlng_to_cell(request.lat, request.lng, H3_RES)
        found = self.store.score(cell, day_type, hour)
        if found is None:
            raise LookupError(
                "No risk data for this location (outside Mumbai, Navi Mumbai, Delhi and Pune streets)."
            )
        score, reasons = found
        return RiskResponse(
            score=round(score),
            level=level_for(score),
            h3_cell=cell,
            reasons=[Reason(label=r["label"], impact=r["impact"]) for r in reasons],
            model_version=MODEL_VERSION,
        )
