# SafeSphere ML API

FastAPI service that serves the server-side models and the Groq LLM helper. The mobile app and admin dashboard call it; Supabase stays the system of record.

| Endpoint | Model | Status |
|---|---|---|
| `GET /health` | – | working |
| `POST /risk` | ML-1 area risk (XGBoost + SHAP) | stub (501) |
| `POST /route` | ML-2 safest route (OSMnx + A*) | stub (501) |
| `POST /reports/classify` | ML-6 report NLP | stub (501) |
| `POST /triage` | ML-8 alert priority | stub (501) |
| `POST /trips/anomaly` | ML-5 journey anomaly | stub (501) |
| `POST /summaries/alert` | Groq alert summary | stub (501); client ready |

Interactive docs: http://localhost:8000/docs

## Layout

```
app/
  main.py            app factory, CORS, lifespan (creates the Groq client)
  core/              settings (.env) and logging
  api/routes/        one router per feature
  schemas/           request/response models (the API contract)
  services/          model wrappers; services/llm/groq_client.py is the Groq client
tests/
```

## Run locally (Windows, everything on D:)

```powershell
$env:PIP_CACHE_DIR = 'D:\DevCache\pip'
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env   # then fill in keys
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Checks:

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\ruff.exe check .
```

## Groq usage rules

The free tier is small (about 30 requests/minute and 1,000/day per model), so `GroqClient`:

- answers identical prompts from a cache (in-memory now; the `llm_cache` table later);
- keeps a per-model token bucket under `GROQ_REQUESTS_PER_MINUTE`;
- on HTTP 429 cools that model down for `retry-after` seconds and tries the next one in `GROQ_MODELS`;
- returns the caller's fallback text when every model is unavailable, and never raises for rate limits.

LLM output is never on the SOS or alert path; it only adds summaries and labelling help.

## Docker

```powershell
docker build -t safesphere-ml-api .
docker run --env-file .env -p 8000:8000 safesphere-ml-api
```
