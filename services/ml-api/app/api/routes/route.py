from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.api.deps import get_routing_service
from app.schemas.route import RouteRequest, RouteResponse
from app.services.routing import RoutingService

router = APIRouter()


@router.post("", response_model=RouteResponse)
async def plan_routes(
    body: RouteRequest, service: RoutingService = Depends(get_routing_service)
) -> RouteResponse:
    try:
        # Dijkstra over a city graph is CPU work; keep the event loop free.
        return await run_in_threadpool(service.plan, body)
    except LookupError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
