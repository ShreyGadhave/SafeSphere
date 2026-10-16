"""Shared helpers for route handlers."""

from fastapi import HTTPException, Request, status

from app.services.llm.groq_client import GroqClient


def not_implemented(feature: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"{feature} is planned but not built yet.",
    )


def get_llm(request: Request) -> GroqClient:
    return request.app.state.llm


def _model_services(request: Request):
    """Risk + routing services, created on first use (scores and graphs are large)."""
    from app.services.risk import RiskService, RiskStore
    from app.services.routing import RoutingService

    state = request.app.state
    if getattr(state, "risk_service", None) is None:
        model_dir = state.settings.model_dir
        try:
            store = RiskStore(model_dir / "risk")
        except FileNotFoundError as e:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
        state.risk_service = RiskService(store)
        state.routing_service = RoutingService(model_dir / "routing", store)
    return state.risk_service, state.routing_service


def get_risk_service(request: Request):
    return _model_services(request)[0]


def get_routing_service(request: Request):
    return _model_services(request)[1]


def get_report_classifier(request: Request):
    """ML-6 pipelines, loaded on first use."""
    from app.services.nlp import ReportClassifier

    state = request.app.state
    if getattr(state, "report_classifier", None) is None:
        settings = state.settings
        try:
            state.report_classifier = ReportClassifier(
                settings.model_dir / "nlp", settings.database_url or None
            )
        except FileNotFoundError as e:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"NLP models missing: {e}") from e
    return state.report_classifier
