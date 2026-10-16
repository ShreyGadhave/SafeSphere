from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from app.api.deps import get_report_classifier
from app.schemas.reports import ClassifyRequest, ClassifyResponse
from app.services.nlp import ReportClassifier

router = APIRouter()


@router.post("/classify", response_model=ClassifyResponse)
async def classify_report(
    body: ClassifyRequest, classifier: ReportClassifier = Depends(get_report_classifier)
) -> ClassifyResponse:
    return await run_in_threadpool(classifier.classify, body)
