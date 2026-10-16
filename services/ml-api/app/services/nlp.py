"""ML-6 report NLP — serving.

Loads the three scikit-learn pipelines trained by `ml/src/safesphere_ml/nlp/train.py`
(category, urgency, moderation) and adds duplicate detection: a new report is a likely duplicate
of an existing one filed within DUP_RADIUS_M and DUP_HOURS when their character n-gram TF-IDF
cosine similarity is at least DUP_SIMILARITY.
"""

from __future__ import annotations

from pathlib import Path
from uuid import UUID

import joblib
import psycopg
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.schemas.reports import ClassifyRequest, ClassifyResponse

MODEL_VERSION = "nlp-tfidf-svm-v1"
DUP_RADIUS_M = 500
DUP_HOURS = 24
DUP_SIMILARITY = 0.55


class ReportClassifier:
    def __init__(self, model_dir: Path, database_url: str | None):
        self.category = joblib.load(model_dir / "category.joblib")
        self.urgency = joblib.load(model_dir / "urgency.joblib")
        self.moderation = joblib.load(model_dir / "moderation.joblib")
        self.database_url = database_url

    def classify(self, req: ClassifyRequest) -> ClassifyResponse:
        text = req.text.strip()
        cat_probs = self.category.predict_proba([text])[0]
        best = int(cat_probs.argmax())
        mod_probs = dict(zip(self.moderation.classes_, self.moderation.predict_proba([text])[0], strict=True))
        return ClassifyResponse(
            category=self.category.classes_[best],
            confidence=round(float(cat_probs[best]), 3),
            urgency=self.urgency.predict([text])[0],
            toxicity=round(float(1.0 - mod_probs.get("ok", 0.0)), 3),
            duplicate_of=self._duplicate_of(text, req.lat, req.lng),
            model_version=MODEL_VERSION,
        )

    def _duplicate_of(self, text: str, lat: float | None, lng: float | None) -> UUID | None:
        if lat is None or lng is None or not self.database_url:
            return None
        try:
            with psycopg.connect(self.database_url, connect_timeout=5) as conn:
                rows = conn.execute(
                    """
                    select id, description from public.reports
                    where status <> 'rejected' and duplicate_of is null
                      and created_at > now() - make_interval(hours => %s)
                      and extensions.st_dwithin(
                        location, extensions.st_makepoint(%s, %s)::extensions.geography, %s
                      )
                    order by created_at desc limit 50
                    """,
                    (DUP_HOURS, lng, lat, DUP_RADIUS_M),
                ).fetchall()
        except psycopg.Error:
            return None
        if not rows:
            return None
        vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5)).fit([text, *(r[1] for r in rows)])
        sims = cosine_similarity(vec.transform([text]), vec.transform([r[1] for r in rows]))[0]
        i = int(sims.argmax())
        return rows[i][0] if sims[i] >= DUP_SIMILARITY else None
