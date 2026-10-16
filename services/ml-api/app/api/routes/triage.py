from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.triage import TriageRequest, TriageResponse

router = APIRouter()


@router.post("", response_model=TriageResponse)
async def triage_alert(body: TriageRequest) -> TriageResponse:
    raise not_implemented("Alert triage (ML-8)")
