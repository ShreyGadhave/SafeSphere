from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.reports import ClassifyRequest, ClassifyResponse

router = APIRouter()


@router.post("/classify", response_model=ClassifyResponse)
async def classify_report(body: ClassifyRequest) -> ClassifyResponse:
    raise not_implemented("Report classification (ML-6)")
