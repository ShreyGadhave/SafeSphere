"""ML-5 journey anomaly detection (Safe Ride / Safe Walk).

Pipeline:
1. Normal trips: Porto taxi trajectories (ECML/PKDD 15) and T-Drive; map-matched to OSM.
2. Synthetic anomalies on OSRM routes in Mumbai/Navi Mumbai, Delhi and Pune: wrong turns,
   long unexpected stops, detours heading away from the destination, GPS silence.
3. Window features: distance to the nearest expected route, heading vs bearing to destination,
   speed z-score, stop duration, change in distance-to-destination, hour, area risk (ML-1).
4. Models: Isolation Forest (unsupervised baseline), then XGBoost on the labelled synthetic set;
   LSTM/GRU sequence model as a stretch goal.
5. Metrics: precision/recall, false alarms per trip, detection delay (s from deviation to alert).
6. Export to ml/models/anomaly/ for the ML API.
"""
