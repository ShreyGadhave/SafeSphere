"""ML-5 journey anomaly detection (Safe Ride / Safe Walk).

Planned: windowed features (distance to the nearest expected route, heading vs bearing to the
destination, speed z-score, stop duration, change in distance-to-destination, hour, area risk)
scored by an Isolation Forest baseline and a supervised XGBoost trained on simulated anomalies.
The phone applies the obvious rules on-device; this service scores the subtle cases.
"""

from app.schemas.trips import AnomalyRequest, AnomalyResponse


class AnomalyService:
    def score(self, request: AnomalyRequest) -> AnomalyResponse:
        raise NotImplementedError("ML-5 journey anomaly model is built in Phase 6")
