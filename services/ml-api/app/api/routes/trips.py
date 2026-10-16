from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.trips import AnomalyRequest, AnomalyResponse

router = APIRouter()


@router.post("/anomaly", response_model=AnomalyResponse)
async def score_trip(body: AnomalyRequest) -> AnomalyResponse:
    raise not_implemented("Journey anomaly detection (ML-5)")
