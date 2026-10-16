"""ML-6 report NLP.

Planned: TF-IDF + logistic regression baseline, then a fine-tuned MuRIL/IndicBERT classifier for
category and urgency, a toxicity head, and sentence-transformer embeddings compared against
nearby recent reports (pgvector) for duplicate detection.
"""

from app.schemas.reports import ClassifyRequest, ClassifyResponse


class ReportClassifier:
    def classify(self, request: ClassifyRequest) -> ClassifyResponse:
        raise NotImplementedError("ML-6 report NLP is built in Phase 4")
