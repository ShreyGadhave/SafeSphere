# SafeSphere

AI-powered personal-safety app for Mumbai, Navi Mumbai, Delhi and Pune — Android app, web admin dashboard, ML service and training pipelines. College AIML major project.

- **Plan, features, flows, ML, roadmap:** [docs/PLAN.md](docs/PLAN.md)
- **Product truth:** [PRODUCT.md](PRODUCT.md)
- **Design system:** [DESIGN.md](DESIGN.md) · approved concept in `design/mockup/`

## Repository

| Path | What | Stack |
|---|---|---|
| `apps/mobile` | Android app | Expo SDK 57, React Native, TypeScript, expo-router, MapLibre |
| `apps/admin` | Admin dashboard + public live-location page | React, Vite, Tailwind v4, MapLibre GL |
| `services/ml-api` | Model serving + Groq summaries | Python, FastAPI |
| `ml` | Datasets, notebooks, training pipelines | Python, scikit-learn, XGBoost, TensorFlow, OSMnx |
| `supabase` | Schema, RLS, RPCs, storage, Edge Functions | Postgres + PostGIS + pgvector |

Each folder has its own README with setup steps.

## Ground rules
- **Zero cost** — no card-gated services (no Google Maps, no Twilio).
- **Secrets** only in gitignored `.env` files; every folder ships a `.env.example`.
- **Disk:** all caches, datasets, venvs and SDKs live on D: (`D:\DevCache`, `ml/data`).
- **Groq** is never on the SOS path; results are cached and have template fallbacks.
