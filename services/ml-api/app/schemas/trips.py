"""ML-5: Safe Ride / Safe Walk journey anomaly detection."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import LatLng

AnomalyKind = Literal["none", "off_route", "unexpected_stop", "heading_away", "overdue", "gps_silent"]


class TripPoint(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    recorded_at: datetime
    speed_mps: float | None = Field(default=None, ge=0)
    heading_deg: float | None = Field(default=None, ge=0, lt=360)
    accuracy_m: float | None = Field(default=None, ge=0)


class AnomalyRequest(BaseModel):
    points: list[TripPoint] = Field(min_length=2)
    expected_routes: list[list[LatLng]] = Field(
        min_length=1, description="All acceptable routes (OSRM alternatives)."
    )
    destination: LatLng
    eta: datetime | None = None
    area_risk: int | None = Field(default=None, ge=0, le=100)


class AnomalyResponse(BaseModel):
    score: float = Field(ge=0, le=1)
    kind: AnomalyKind
    is_anomaly: bool
    details: dict[str, float]
    model_version: str
