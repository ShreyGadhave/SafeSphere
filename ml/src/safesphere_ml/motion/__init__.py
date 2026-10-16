"""ML-4 fall / snatch / violent-motion detection (runs on the phone).

Pipeline:
1. Load SisFall, MobiAct and UCI-HAR accelerometer + gyroscope recordings; resample to a common
   rate (50 Hz) and units (g, rad/s).
2. Sliding windows (e.g. 2.56 s, 50% overlap); classes: normal, fall, snatch, deliberate shake.
   Snatch and shake windows are recorded by us since no public dataset has them.
3. Baseline: per-window statistical features + Random Forest.
4. Main model: 1D-CNN (or CNN-LSTM) on raw windows.
5. Metrics: sensitivity, specificity, F1, confusion matrix; subject-wise split to avoid leakage.
6. Export to TFLite -> ml/models/motion/.
"""
