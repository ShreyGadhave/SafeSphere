"""ML-1 area risk prediction.

Planned: load the per-city XGBoost model + SHAP explainer from MODEL_DIR, map (lat, lng) to an
H3 cell, build the feature row (hour, weekday, OSM densities, incident KDE) and return a 0-100
score with the top SHAP reasons. Precomputed scores also live in the `risk_cells` table so the
app can draw the heatmap without calling this service per cell.
"""

from app.schemas.risk import RiskRequest, RiskResponse


class RiskService:
    def score(self, request: RiskRequest) -> RiskResponse:
        raise NotImplementedError("ML-1 risk model is built in Phase 2")
