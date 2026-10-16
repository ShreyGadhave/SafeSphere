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
