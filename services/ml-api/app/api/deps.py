"""Shared helpers for route handlers."""

import logging
import threading

from fastapi import HTTPException, Request, status

from app.services.llm.groq_client import GroqClient


def not_implemented(feature: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"{feature} is planned but not built yet.",
    )


def get_llm(request: Request) -> GroqClient:
    return request.app.state.llm


log = logging.getLogger(__name__)
_load_lock = threading.Lock()


def load_model_services(state) -> None:
    """Risk + routing services (scores and graphs are large). Idempotent and thread-safe."""
    from app.services.risk import RiskService, RiskStore
    from app.services.routing import RoutingService

    with _load_lock:
        if getattr(state, "risk_service", None) is not None:
            return
        model_dir = state.settings.model_dir
        store = RiskStore(model_dir / "risk")
        state.routing_service = RoutingService(model_dir / "routing", store)
        state.risk_service = RiskService(store)


def warm_up(state) -> None:
    """Startup preload (runs in a background thread): models, every city graph, NLP pipelines."""
    try:
        load_model_services(state)
        state.routing_service.load_all()
        log.info("risk + routing models warmed up")
    except Exception:  # missing model files etc. — requests will report it
        log.exception("model warm-up failed")
    try:
        _load_classifier(state)
        log.info("report classifier warmed up")
    except Exception:
        log.exception("classifier warm-up failed")


def _model_services(request: Request):
    state = request.app.state
    try:
        load_model_services(state)
    except FileNotFoundError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return state.risk_service, state.routing_service


def get_risk_service(request: Request):
    return _model_services(request)[0]


def get_routing_service(request: Request):
    return _model_services(request)[1]


def get_report_classifier(request: Request):
    """ML-6 pipelines, loaded at startup (or on first use)."""
    try:
        return _load_classifier(request.app.state)
    except FileNotFoundError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"NLP models missing: {e}") from e


def _load_classifier(state):
    from app.services.nlp import ReportClassifier

    with _load_lock:
        if getattr(state, "report_classifier", None) is None:
            settings = state.settings
            state.report_classifier = ReportClassifier(
                settings.model_dir / "nlp", settings.database_url or None
            )
    return state.report_classifier
