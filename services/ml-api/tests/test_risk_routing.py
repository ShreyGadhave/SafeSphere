"""ML-1 serving + ML-2 routing on a tiny synthetic city (no downloads, no database)."""

import json

import h3
import numpy as np
import pandas as pd
import pytest

from app.schemas.common import LatLng
from app.schemas.risk import RiskRequest
from app.schemas.route import RouteRequest
from app.services.risk import H3_RES, RiskService, RiskStore
from app.services.routing import RoutingService

# Three nodes: a direct road start -> end through a risky cell, and a longer detour via `top`.
START, END, TOP = (19.000, 72.800), (19.000, 72.830), (19.020, 72.815)
DIRECT_MID, LEG1_MID, LEG2_MID = (19.000, 72.815), (19.010, 72.8075), (19.010, 72.8225)


def cell(p):
    return h3.latlng_to_cell(p[0], p[1], H3_RES)


@pytest.fixture
def services(tmp_path):
    risky = cell(DIRECT_MID)
    cells = sorted({risky, cell(LEG1_MID), cell(LEG2_MID)})
    rows = [
        {
            "h3_index": c,
            "hour": h,
            "day_type": d,
            "score": 100.0 if c == risky else 5.0,
            "reasons": json.dumps([{"feature": "time", "label": "Late night", "impact": 40}]),
        }
        for c in cells
        for h in range(24)
        for d in ("weekday", "weekend")
    ]
    (tmp_path / "risk").mkdir()
    pd.DataFrame(rows).to_parquet(tmp_path / "risk" / "scores_test.parquet")

    lat = np.array([START[0], END[0], TOP[0]])
    lng = np.array([START[1], END[1], TOP[1]])
    edge_cells = [cell(DIRECT_MID), cell(LEG1_MID), cell(LEG2_MID)]
    names, idx = np.unique(np.array(edge_cells), return_inverse=True)
    geom = np.array(
        [
            [lng[0], lat[0]],
            [lng[1], lat[1]],
            [lng[0], lat[0]],
            [lng[2], lat[2]],
            [lng[2], lat[2]],
            [lng[1], lat[1]],
        ]
    )
    (tmp_path / "routing").mkdir()
    np.savez(
        tmp_path / "routing" / "test_walk.npz",
        lat=lat,
        lng=lng,
        u=np.array([0, 0, 2], dtype=np.int32),
        v=np.array([1, 2, 1], dtype=np.int32),
        length=np.array([3150, 2600, 2600], dtype=np.float32),
        edge_cell=idx.astype(np.int32),
        cells=names,
        geom=geom.astype(np.float32),
        geom_off=np.array([0, 2, 4, 6]),
    )
    store = RiskStore(tmp_path / "risk")
    return RiskService(store), RoutingService(tmp_path / "routing", store)


def test_risk_lookup_returns_score_and_reasons(services):
    risk, _ = services
    res = risk.score(RiskRequest(lat=DIRECT_MID[0], lng=DIRECT_MID[1], hour=23))
    assert res.score == 100 and res.level == "high"
    assert res.reasons[0].label == "Late night"


def test_risk_outside_cities_is_lookup_error(services):
    risk, _ = services
    with pytest.raises(LookupError):
        risk.score(RiskRequest(lat=40.0, lng=-74.0, hour=10))


def test_safest_route_avoids_risky_cell(services):
    _, routing = services
    res = routing.plan(
        RouteRequest(
            origin=LatLng(lat=START[0], lng=START[1]), destination=LatLng(lat=END[0], lng=END[1]), mode="walk"
        )
    )
    labels = [r.label for r in res.routes]
    assert labels == ["fastest", "balanced"]  # safest == balanced here, merged
    fastest, safer = res.routes
    assert fastest.distance_m == 3150 and fastest.risk_exposure == 100.0
    assert safer.distance_m == 5200 and safer.risk_exposure == 5.0
    assert safer.polyline[0].lat == pytest.approx(START[0]) and safer.polyline[-1].lng == pytest.approx(
        END[1]
    )
