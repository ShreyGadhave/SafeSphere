from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_risk_service
from app.schemas.risk import RiskRequest, RiskResponse
from app.services.risk import RiskService

router = APIRouter()


@router.post("", response_model=RiskResponse)
async def score_location(body: RiskRequest, service: RiskService = Depends(get_risk_service)) -> RiskResponse:
    try:
        return service.score(body)
    except LookupError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
