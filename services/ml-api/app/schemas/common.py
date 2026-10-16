"""Shared request/response types."""

from pydantic import BaseModel, Field


class LatLng(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class Reason(BaseModel):
    """One factor behind a model score, e.g. a SHAP contribution."""

    label: str
    impact: float = Field(description="Signed contribution in score points; positive raises the score.")
