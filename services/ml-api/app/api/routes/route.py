from fastapi import APIRouter

from app.api.deps import not_implemented
from app.schemas.route import RouteRequest, RouteResponse

router = APIRouter()


@router.post("", response_model=RouteResponse)
async def plan_routes(body: RouteRequest) -> RouteResponse:
    raise not_implemented("Safest route (ML-2)")
