# Notebooks

One notebook per experiment. Each starts with:

```python
from safesphere_ml.common.paths import configure_caches, ensure_dirs
configure_caches()
ensure_dirs()
```

Reusable code moves into `src/safesphere_ml/`; notebooks keep the exploration, plots and the metric tables that go into the project report. Log runs to MLflow (`ml/mlruns/`).

| Notebook | Model | What it covers |
|---|---|---|
| `01_risk_eda.ipynb` | ML-1 | Crime data exploration, H3 aggregation, KDE / HDBSCAN hotspots, PAI |
| `02_risk_model.ipynb` | ML-1 | Feature building, logistic regression vs XGBoost/LightGBM, SHAP |
| `03_safest_route.ipynb` | ML-2 | OSMnx graphs, risk-weighted A*, Pareto routes, risk-vs-time evaluation |
| `04_audio_yamnet.ipynb` | ML-3 | MFCC baseline, YAMNet transfer learning, false alarms/hour, TFLite export |
| `05_motion_cnn.ipynb` | ML-4 | Sensor windows, Random Forest baseline, 1D-CNN, TFLite export |
| `06_trip_anomaly.ipynb` | ML-5 | Porto/T-Drive trips, synthetic anomalies, Isolation Forest vs XGBoost, detection delay |
| `07_report_nlp.ipynb` | ML-6 | Groq-assisted labelling, TF-IDF baseline, MuRIL fine-tuning, duplicate detection |
