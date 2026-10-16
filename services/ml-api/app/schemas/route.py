"""ML-2: safest-route planning."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import LatLng


class RouteRequest(BaseModel):
    origin: LatLng
    destination: LatLng
    mode: Literal["walk", "drive"] = "walk"
    risk_weight: float | None = Field(
        default=None,
        ge=0,
        alias="lambda",
        description="Trade-off between distance and risk. Omit to get fastest, balanced and safest routes.",
    )

    model_config = {"populate_by_name": True}


class PlannedRoute(BaseModel):
    label: Literal["fastest", "balanced", "safest", "custom"]
    polyline: list[LatLng]
    duration_s: float
    distance_m: float
    risk_exposure: float = Field(description="Length-weighted mean risk along the route, 0-100.")


class RouteResponse(BaseModel):
    routes: list[PlannedRoute]
