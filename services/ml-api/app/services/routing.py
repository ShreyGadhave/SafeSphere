"""ML-2 safest route.

Planned: keep one OSMnx road graph per city pack in memory (Mumbai+Navi Mumbai, Delhi, Pune),
weight each edge as `length * (1 + lambda * risk)`, and run A* for several lambda values to
return the fastest / balanced / safest Pareto set.
"""

from app.schemas.route import RouteRequest, RouteResponse


class RoutingService:
    def plan(self, request: RouteRequest) -> RouteResponse:
        raise NotImplementedError("ML-2 safest route is built in Phase 2")
