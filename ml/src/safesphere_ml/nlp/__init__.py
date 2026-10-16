"""ML-6 community report NLP.

Pipeline:
1. Dataset: ~1,500 SafeSphere-style reports (English, Hindi, Hinglish) drafted with Groq in
   throttled, resumable batches and checked by hand; HASOC and Jigsaw for toxicity.
2. Tasks: category (harassment, theft, assault, accident, medical, fire, infrastructure,
   suspicious activity, other), urgency (low/medium/high), toxicity.
3. Baseline: TF-IDF + logistic regression.
4. Main model: fine-tuned MuRIL (or IndicBERT) for code-mixed text.
5. Duplicates: sentence-transformer embeddings + cosine similarity within a radius/time window.
6. Metrics: macro-F1 per task; export to ml/models/nlp/.
"""
