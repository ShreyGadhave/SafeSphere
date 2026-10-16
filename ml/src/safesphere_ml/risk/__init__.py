"""ML-1 area risk prediction.

Pipeline:
1. Ingest geocoded crime data for a method-validation city (data.police.uk or Chicago) and the
   Indian priors (NCRB district tables), plus approved SafeSphere community reports.
2. Build an H3 grid (resolution 9) per city pack; aggregate incidents per cell x hour x day type.
3. Features: hour, weekday/weekend, OSM densities (street lights, police, bars, bus stops,
   footways), road class mix, incident KDE, distance to nearest police station.
4. Hotspots: KDE and HDBSCAN for exploration; Predictive Accuracy Index (PAI) for hotspot quality.
5. Models: logistic regression baseline, then XGBoost/LightGBM; ROC-AUC and PR-AUC on a
   time-based split.
6. Explain with SHAP; export model + explainer to ml/models/risk/<city>/ and precomputed scores
   to the `risk_cells` table.
"""
