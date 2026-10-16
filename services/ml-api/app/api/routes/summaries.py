from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.summaries import AlertSummaryRequest, AlertSummaryResponse

router = APIRouter()


@router.post("/alert", response_model=AlertSummaryResponse)
async def summarize_alert(body: AlertSummaryRequest) -> AlertSummaryResponse:
    # Needs the alert row from Supabase; the Groq client itself is ready (app.state.llm).
    raise not_implemented("Alert summaries")
