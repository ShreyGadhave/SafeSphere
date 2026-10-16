from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_llm
from app.schemas.summaries import AlertSummaryRequest, AlertSummaryResponse
from app.services.llm.groq_client import GroqClient
from app.services.summaries import summarize

router = APIRouter()


@router.post("/alert", response_model=AlertSummaryResponse)
async def summarize_alert(
    body: AlertSummaryRequest, request: Request, llm: GroqClient = Depends(get_llm)
) -> AlertSummaryResponse:
    database_url = request.app.state.settings.database_url
    if not database_url:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="DATABASE_URL is not configured")
    result = await summarize(database_url, llm, body.alert_id)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return result
