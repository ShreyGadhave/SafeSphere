"""ML-8 alert triage priority (stretch).

Pipeline:
1. Hand-label ~200 alert scenarios with a priority (low / medium / high).
2. Inputs: emergency type, trigger, motion/audio/anomaly model confidences, area risk, hour,
   battery, whether the user answered the check-in.
3. Weighted logistic scoring calibrated on the labelled scenarios; report the weights as the
   explanation shown on the admin dashboard.
4. Metrics: accuracy and Spearman correlation against the hand ranking.
"""
