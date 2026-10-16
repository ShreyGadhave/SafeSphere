"""LLM-written alert summaries for the admin dashboard."""

from uuid import UUID

from pydantic import BaseModel


class AlertSummaryRequest(BaseModel):
    alert_id: UUID


class AlertSummaryResponse(BaseModel):
    alert_id: UUID
    text: str
    model: str | None
    cached: bool
    fallback_used: bool
