"""ML-3 scream / distress audio detection (runs on the phone).

Pipeline:
1. Collect positives from AudioSet (Screaming, Shout, Yell, Crying/sobbing) plus self-recorded
   "help" / "bachao" clips; negatives and background noise from ESC-50 and UrbanSound8K.
2. Resample to 16 kHz mono, split into 0.96 s frames (YAMNet input).
3. Baseline: MFCC statistics + SVM / Random Forest.
4. Main model: frozen YAMNet embeddings (1024-d) + small dense head; also try a log-mel CNN.
5. Metrics: precision, recall, F1, and false alarms per hour of everyday background audio.
6. Export the head (with YAMNet) to TFLite for react-native-fast-tflite -> ml/models/audio/.
"""
