from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.risk import RiskRequest, RiskResponse

router = APIRouter()


@router.post("", response_model=RiskResponse)
async def score_location(body: RiskRequest) -> RiskResponse:
    raise not_implemented("Risk prediction (ML-1)")
