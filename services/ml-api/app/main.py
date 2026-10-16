"""FastAPI entry point: `uvicorn app.main:app --reload`."""

import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import warm_up
from app.api.routes import health, reports, risk, route, summaries, triage, trips
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.services.llm.groq_client import GroqClient


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.settings = settings
        app.state.llm = GroqClient.from_settings(settings)
        if settings.warm_models:
            threading.Thread(target=warm_up, args=(app.state,), name="model-warmup", daemon=True).start()
        try:
            yield
        finally:
            await app.state.llm.aclose()

    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(risk.router, prefix="/risk", tags=["risk"])
    app.include_router(route.router, prefix="/route", tags=["route"])
    app.include_router(reports.router, prefix="/reports", tags=["reports"])
    app.include_router(triage.router, prefix="/triage", tags=["triage"])
    app.include_router(summaries.router, prefix="/summaries", tags=["summaries"])
    app.include_router(trips.router, prefix="/trips", tags=["trips"])
    return app


app = create_app()
