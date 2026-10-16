"""ML-2 safest route.

Pipeline:
1. Download the drive and walk graphs per city pack with OSMnx (cached under D:\\DevCache\\osmnx).
2. Join each edge to its H3 cell and attach the ML-1 risk score for each hour bucket.
3. Edge weight = length * (1 + lambda * risk / 100); run A* (haversine heuristic) for several
   lambda values to get a fastest / balanced / safest Pareto set.
4. Evaluate on sampled origin-destination pairs: % reduction in risk exposure vs % increase in
   travel time compared with the plain shortest path (OSRM).
5. Export compact graphs (GraphML / pickled NetworkX) to ml/models/routing/<city>/.
"""
