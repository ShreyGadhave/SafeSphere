"""ML-6: community report NLP."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

ReportCategory = Literal[
    "harassment",
    "theft",
    "assault",
    "accident",
    "medical",
    "fire",
    "infrastructure",
    "suspicious",
    "other",
]


class ClassifyRequest(BaseModel):
    text: str = Field(min_length=3, max_length=2000)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class ClassifyResponse(BaseModel):
    category: ReportCategory
    confidence: float = Field(ge=0, le=1)
    urgency: Literal["low", "medium", "high"]
    toxicity: float = Field(ge=0, le=1)
    duplicate_of: UUID | None = None
    model_version: str
