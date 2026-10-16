"""ML-8: alert triage priority."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import Reason

EmergencyType = Literal["medical", "accident", "crime", "harassment", "fire", "other", "unknown"]
AlertTrigger = Literal["button", "motion", "audio", "shake", "ride_anomaly", "checkin_timeout", "battery"]


class TriageRequest(BaseModel):
    emergency_type: EmergencyType = "unknown"
    trigger: AlertTrigger
    motion_score: float | None = Field(default=None, ge=0, le=1)
    audio_score: float | None = Field(default=None, ge=0, le=1)
    anomaly_score: float | None = Field(default=None, ge=0, le=1)
    area_risk: int | None = Field(default=None, ge=0, le=100)
    local_hour: int = Field(ge=0, le=23)
    battery_pct: int | None = Field(default=None, ge=0, le=100)
    responded_to_checkin: bool | None = None


class TriageResponse(BaseModel):
    priority: int = Field(ge=0, le=100)
    level: Literal["low", "medium", "high"]
    breakdown: list[Reason]
