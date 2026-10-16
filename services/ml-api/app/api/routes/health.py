from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health", tags=["health"])
async def health(request: Request) -> dict[str, object]:
    settings = request.app.state.settings
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
        "llm_configured": bool(settings.groq_api_key),
    }
