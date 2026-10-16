"""ML-1: area risk prediction."""

from pydantic import BaseModel, Field

from app.schemas.common import Reason


class RiskRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    hour: int | None = Field(default=None, ge=0, le=23, description="Defaults to the current local hour.")


class RiskResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    level: str = Field(description="low | medium | high")
    h3_cell: str
    reasons: list[Reason]
    model_version: str
