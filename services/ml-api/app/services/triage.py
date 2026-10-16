"""ML-8 alert triage.

Planned: weighted logistic scoring over emergency type, trigger, on-device model confidences,
area risk, time of day, battery and check-in response, calibrated on hand-labelled scenarios.
"""

from app.schemas.triage import TriageRequest, TriageResponse


class TriageService:
    def prioritise(self, request: TriageRequest) -> TriageResponse:
        raise NotImplementedError("ML-8 triage is built in Phase 6")
