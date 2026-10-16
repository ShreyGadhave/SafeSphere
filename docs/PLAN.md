# SafeSphere — Project Plan

**Status:** Approved for build · **Last updated:** 2026-10-16
**Type:** AIML college major project · **Platform:** Android app + web admin dashboard
**Cities:** Mumbai, Navi Mumbai (one region: "MMR"), Delhi, Pune

> SafeSphere is a personal-safety app for everyone. It **predicts** risk before
> something happens, **detects** emergencies automatically when they do, and
> **responds** by getting help fast.

| Layer | Question it answers | AI behind it |
|---|---|---|
| **Prevent** | "Is this place / route / time risky for me?" | ML-1 risk prediction, ML-2 safest route |
| **Detect** | "Is something going wrong, even if I can't press a button?" | ML-3 scream detection, ML-4 fall/snatch detection, ML-5 journey anomaly |
| **Respond** | "Who needs help first, and what happened?" | ML-8 triage score, ML-6 report NLP, Groq alert summaries |

---

## 1. Constraints (decided — do not re-open without a reason)

| Constraint | Decision |
|---|---|
| Cost | **Zero.** No card-gated service anywhere. |
| Platform | **Android only**, Android 7.0+ (one APK). Runs as a dev build / APK, **not Expo Go**. |
| Mobile framework | **Expo SDK 57** (React Native, TypeScript, expo-router). SDK 58 is two weeks old — too new for map/ML libraries. |
| Maps | **MapLibre** + **OpenFreeMap** tiles (no key). No Google Maps. |
| Geocoding / search | Android device geocoder, **Nominatim / Photon** (OSM). |
| Routing | **OSRM** (fastest/alternatives) + our **OSMnx** graph (safest). |
| SMS / calls | Sent **from the user's own phone** (Android `SmsManager` + direct-call intent, local Expo module). Works without internet. No Twilio. |
| Server-side notify | **Expo Push** (free Firebase FCM). Optional Telegram bot / email later. |
| Backend | **Supabase** (new project, free tier): Postgres + PostGIS + pgvector, Auth, Realtime, Storage, Edge Functions. |
| LLM | **Groq** free tier. Limits are small (~30 req/min, ~1K req/day per model). See §6.4. |
| RAG assistant | **Out of scope** for now (was ML-7). |
| Storage | **Everything on D:** — caches in `D:\DevCache`, datasets in `ml/data/`. C: is nearly full. |
| Builds | **EAS Build** (free Expo account) for the dev APK; no local Android SDK needed. |

---

## 2. Feature list

Priority: **P0** must-have · **P1** should-have · **P2** if time allows. 🤖 = uses an AI/ML model.

### A. Account & onboarding
| ID | Feature | P |
|---|---|---|
| A1 | Sign up / login: email + password, forgot password (Supabase Auth) | P0 |
| A2 | Profile: name, phone, photo, city (Mumbai / Navi Mumbai / Delhi / Pune) | P0 |
| A3 | Medical card: blood group, allergies, conditions, medicines — shared with responders during SOS | P1 |
| A4 | Emergency contacts: 1–5, import from phone, one primary, "send test alert" | P0 |
| A5 | Safety PIN (cancels alerts) + duress PIN (looks like a cancel, silently continues SOS) — stored hashed on device | P0 |
| A6 | Permission walkthrough explaining each permission | P0 |

### B. SOS & emergency
| ID | Feature | P |
|---|---|---|
| B1 | SOS button: hold 3 s, then 5 s cancel countdown | P0 |
| B2 | Emergency type: medical / accident / crime / harassment / fire / other (auto "unknown" after 3 s) | P0 |
| B3 | 🤖 Motion trigger: fall / snatch / violent motion (ML-4); shake pattern as fallback | P0 |
| B4 | 🤖 Voice trigger: scream / distress sound (ML-3), on-device only | P0 |
| B5 | Every AI trigger first shows "Are you OK?" for 10 s with vibration | P0 |
| B6 | On SOS: SMS to contacts (live link + medical card), direct call to primary, push to guardians within 5 km, alert on admin dashboard | P0 |
| B7 | Live location web page: private token link, updates every 5–10 s, expires | P0 |
| B8 | Audio evidence: auto-record, upload in 30 s chunks | P0 |
| B9 | Silent mode or siren mode | P1 |
| B10 | No internet → SMS still goes out from the phone with last known location | P0 |
| B11 | Helpline quick-dial: 112, 100, 101, 102/108, 1091, 181, 1098, 1930 | P0 |

### C. Safe Journey
| ID | Feature | P |
|---|---|---|
| C1 | 🤖 Route planner: fastest / balanced / safest with time + risk score (ML-2) | P0 |
| C2 | Safe Walk: monitored walking trip with check-ins | P0 |
| C3 | 🤖 Safe Ride: share/paste cab link → parse → confirm → monitor (ML-5) | P0 |
| C4 | Background monitoring: off route, unexpected stop, heading away, overdue, GPS silent (server-side) | P0 |
| C5 | Check-in timer ("home in 20 min") | P1 |
| C6 | Auto "reached safely" message on arrival | P1 |
| C7 | Low battery (<10%) during a trip → auto-share last location | P1 |
| C8 | Trip history | P2 |

### D. Safety Map
| ID | Feature | P |
|---|---|---|
| D1 | 🤖 Risk heatmap with time-of-day slider (ML-1) | P0 |
| D2 | Community incident markers, clustered, filter by category/time | P0 |
| D3 | Safe places from OSM: police, hospitals, 24×7 pharmacies, fuel stations; "nearest safe place" | P0 |
| D4 | 🤖 Tap anywhere → area safety card with SHAP reasons | P1 |
| D5 | Entering a high-risk zone at night → gentle warning | P1 |

### E. Community
| ID | Feature | P |
|---|---|---|
| E1 | Report incident: category, description, photo, GPS + draggable pin, time, anonymous option | P0 |
| E2 | 🤖 Auto category + urgency, spam/toxicity filter, duplicate merge (ML-6) | P1 |
| E3 | Nearby / city feed, "I saw this too" confirmations, comments | P0 |
| E4 | Admin moderation; approved reports feed the risk model | P0 |

### F. Guardian network
| ID | Feature | P |
|---|---|---|
| F1 | Opt in as volunteer guardian; admin verifies | P1 |
| F2 | Push for SOS within 5 km → "I'm responding" → navigate | P1 |
| F3 | Active alerts list | P1 |

### G. Utilities
| ID | Feature | P |
|---|---|---|
| G1 | Fake call: caller name, delay, ringtone | P0 |
| G2 | Evidence vault: recordings/photos with SHA-256 hash + timestamp | P1 |
| G3 | Settings: trigger sensitivity, AI triggers on/off, silent/siren | P0 |
| G4 | Hindi UI | P2 |

### H. Admin dashboard (web)
| ID | Feature | P |
|---|---|---|
| H1 | Admin login with roles (admin / moderator) | P0 |
| H2 | 🤖 Live alerts map + list sorted by triage priority (ML-8) | P0 |
| H3 | Alert detail: user, medical card, trail, audio, contacts; status + resolve | P0 |
| H4 | 🤖 Groq one-line alert summary (cached, template fallback) | P1 |
| H5 | Report moderation queue with AI suggestions | P0 |
| H6 | Zone management, guardian verification | P1 |
| H7 | Analytics by city / category / hour, hotspot map | P1 |
| H8 | ML monitoring: model versions, metrics, false-alarm feedback | P1 |

---

## 3. App flows

### 3.1 First launch
```
Splash → Onboarding (3 slides) → Sign up / Login
  → Profile + City → Emergency contacts (min 1) → Safety PIN + Duress PIN
  → Permissions (Location "Allow all the time", Mic, Notifications, Contacts, SMS, Phone)
  → Home
```

### 3.2 Navigation
```
Tabs:  Home | Map | ● SOS | Community | Profile
Home      → risk card, Safe Ride / Safest route / Safe Walk / Fake call, protection toggles, active-trip banner
Map       → risk heatmap, incidents, safe places, tap → area safety card
SOS       → hold button, emergency type, helplines
Community → feed (nearby / city), + Report
Profile   → profile, medical card, contacts, PINs, AI trigger settings, evidence vault, trips, guardian mode
Stacks:   ride/, ride/alert, walk/, sos-active, report/new, fake-call
```

### 3.3 SOS state machine
```
IDLE ──trigger──▶ (AI trigger? → CONFIRM "Are you OK?" 10 s ──OK──▶ IDLE)
      ──▶ COUNTDOWN 5 s ──cancel(PIN)──▶ IDLE
      ──▶ ACTIVE
            ├ alert row (Supabase) → dashboard realtime
            ├ SMS to contacts from device (live link, type, medical card)   [offline OK]
            ├ direct call to primary contact
            ├ push to guardians ≤ 5 km (Edge Function)
            ├ audio recording → 30 s chunk uploads (SHA-256 per chunk)
            └ location every 5 s → alert_locations
      ACTIVE ──PIN──▶ RESOLVED ("I'm safe" SMS)
      ACTIVE ──duress PIN──▶ looks RESOLVED on screen, alert stays active (is_duress = true)
```

### 3.4 Safe Ride
```
Cab app → Share → SafeSphere (or paste)
  → parse provider / driver / plate / destination (regex + cleanup)
  → confirm screen (user fills anything missing — never guessed)
  → OSRM alternatives + risk score
  → MONITORING (foreground service, phone) + heartbeat check (server)
       normal → arrival → "Reached safely" SMS → trip saved
       anomaly → alarm + "Are you OK?" countdown (PIN)
            PIN → continue (logged as false alarm → ML-5 feedback)
            no answer / duress → SOS ACTIVE (driver + plate in SMS)
```
Anomaly rules (first version; ML-5 refines): off every expected route > 150 m for > 30 s **and** distance to destination increasing; speed ≈ 0 for > 4 min away from destination; sustained heading away; ETA overrun > 50 %; no heartbeat for 5 min (server).

### 3.5 Report incident
```
+ Report → category (AI suggests) → description → photo? → location (GPS, drag pin) → anonymous?
  → submit → ML-6 (category, urgency, toxicity, duplicate) → admin moderation
  → approved → map marker + feed + risk model training data
```

### 3.6 Guardian
```
SOS ≤ 5 km → push → open alert → "I'm responding" → navigate → resolved by user / admin
```

---

## 4. Architecture

```
┌──────────── Android app (Expo SDK 57) ─────────────┐
│ expo-router UI · MapLibre · Reanimated              │
│ On-device: TFLite audio (ML-3) + motion (ML-4)      │
│ Native module: SMS + direct call (offline SOS)      │
│ Foreground service: trip + SOS location             │
└──────┬──────────────────────────┬───────────────────┘
       │ supabase-js               │ HTTPS
       ▼                           ▼
 Supabase                     FastAPI ML service (Docker, free host)
 - Auth                       - /risk      (XGBoost + SHAP, risk_cells)
 - Postgres + PostGIS         - /route     (OSMnx risk-weighted A*)
 - pgvector                   - /reports/classify (MuRIL / TF-IDF)
 - Realtime  ─────────┐       - /trips/anomaly    (Isolation Forest → XGBoost)
 - Storage            │       - /triage    (ML-8)
 - Edge Functions     │       - /summaries (Groq, cached)
   (push, heartbeat)  │
                      ▼
 Admin dashboard (React + Vite + Tailwind + MapLibre GL) — live alerts, triage, moderation, analytics
 Public live-location page (served by the admin app at /live/:token)
```

### 4.1 Tech stack

| Layer | Choice |
|---|---|
| Mobile | Expo SDK 57, React Native, TypeScript, expo-router, Reanimated, Gesture Handler, @gorhom/bottom-sheet, lucide-react-native |
| Mobile platform APIs | expo-location + expo-task-manager (background), expo-sensors, expo-audio, expo-notifications, expo-secure-store, expo-contacts, expo-haptics |
| On-device ML | react-native-fast-tflite (Phase 3) |
| Maps | @maplibre/maplibre-react-native, maplibre-gl (web), OpenFreeMap tiles |
| Backend | Supabase (Postgres 15+, PostGIS, pgvector, RLS, Realtime, Storage, Edge Functions/Deno) |
| ML service | Python 3.13, FastAPI, pydantic-settings, httpx; Docker; free host (Render / Hugging Face Spaces) |
| ML training | pandas, scikit-learn, XGBoost/LightGBM, SHAP, OSMnx + NetworkX, H3, TensorFlow/Keras → TFLite, librosa, Transformers (MuRIL), sentence-transformers, MLflow, Jupyter |
| Admin | React + Vite + TypeScript, Tailwind v4, React Router, Motion, maplibre-gl, lucide-react |
| LLM | Groq (OpenAI-compatible API), server-side only |
| Builds | EAS Build (Android APK / dev client) |

---

## 5. Repository structure

```
safesphere/
├── README.md               # how to run everything
├── PRODUCT.md              # product truth (who, why, what)
├── DESIGN.md               # design system (tokens, components, motion)
├── docs/
│   └── PLAN.md             # this file
├── design/mockup/          # approved UI concept (canvas source)
├── apps/
│   ├── mobile/             # Expo app
│   │   ├── src/
│   │   │   ├── app/             # expo-router routes only (thin)
│   │   │   ├── components/ui/   # design-system primitives
│   │   │   ├── features/<name>/ # screens/, hooks/, services/ per feature
│   │   │   ├── lib/             # supabase, env, api clients
│   │   │   └── theme/           # tokens
│   │   └── modules/        #   local native modules (sms-call) — Phase 1
│   └── admin/              # React + Vite dashboard
│       └── src/{app,layouts,pages,components,lib,types}
├── services/
│   └── ml-api/             # FastAPI: app/{api,core,schemas,services}, tests/
├── ml/                     # training workspace
│   ├── data/{raw,interim,processed,cache}   # gitignored, on D:
│   ├── notebooks/          # EDA + experiments (report material)
│   ├── src/safesphere_ml/  # pipelines per model
│   ├── configs/            # per-city configs
│   ├── models/             # exported artifacts
│   └── requirements/
└── supabase/
    ├── migrations/         # ordered SQL (schema, RLS, functions, storage)
    ├── functions/          # Edge Functions (Deno)
    └── seed.sql
```

Conventions: TypeScript strict everywhere; feature folders own their screens/hooks/services; routes stay thin; secrets only in `.env` files (gitignored, `.env.example` committed); the mobile app only ever holds the Supabase **anon** key — service-role key and Groq key live in the ML service / Edge Functions.

---

## 6. AI / ML

Every model ships with: dataset + license, baseline, main model, metrics, and a notebook for the report.

| ID | Model | Data | Baseline → Main | Metrics | Runs on |
|---|---|---|---|---|---|
| ML-1 | Area risk (H3 cell × hour) | data.police.uk / Chicago (method validation) → OSM features + NCRB priors + app reports for MMR, Delhi, Pune | Logistic regression → **XGBoost/LightGBM**; KDE + HDBSCAN hotspots; **SHAP** reasons | ROC-AUC, PR-AUC, **PAI** | ML API (precomputed into `risk_cells`) |
| ML-2 | Safest route | OSMnx city graphs + ML-1 scores | Shortest path → **risk-weighted A\*** `w = length × (1 + λ·risk)`, λ sweep → Pareto set | % risk-exposure reduction vs % time increase | ML API |
| ML-3 | Scream / distress audio | AudioSet (Screaming/Shout/Crying), ESC-50, UrbanSound8K, own "help/bachao" clips | MFCC + SVM → **YAMNet embeddings + dense head** → TFLite | Precision, recall, F1, **false alarms / hour** | Phone |
| ML-4 | Fall / snatch / motion | SisFall, MobiAct, UCI-HAR | Window features + Random Forest → **1D-CNN** → TFLite | Sensitivity, specificity, F1 | Phone |
| ML-5 | Journey anomaly | Porto taxi, T-Drive (normal trips) + simulated anomalies on OSRM routes in our cities + real test rides + user feedback | Rules → **Isolation Forest** → **XGBoost** (supervised on simulated) | Precision/recall, false alarms per trip, **detection delay** | Phone (rules) + ML API |
| ML-6 | Report NLP | HASOC (Hinglish), Jigsaw, ~1,500 own reports (Groq-drafted, human-checked) | TF-IDF + LR → **MuRIL** fine-tune; sentence-transformer dedupe | Macro-F1 per class | ML API |
| ML-8 | Alert triage | Hand-labelled scenarios | Weighted logistic scoring | Ranking agreement with labels | ML API |

### 6.1 Features per model (summary)
- **ML-1:** H3 cell (res 9), hour, weekday/weekend, counts within 250 m of street lamps / police / bars / bus stops / ATMs, road class, KDE incident density, distance to police station.
- **ML-5:** distance to nearest expected route, heading vs bearing-to-destination, speed, stop duration, Δ distance-to-destination, time of day, ML-1 cell risk.
- **ML-8:** trigger type, model confidences (ML-3/4/5), area risk, hour, battery, user responded?, duress flag.

### 6.2 Where models run
- On-device (privacy + offline): ML-3, ML-4, ML-5 rules.
- Server: ML-1 (batch → `risk_cells`, served from DB), ML-2, ML-5 model, ML-6, ML-8.

### 6.3 Feedback loop
False-alarm responses (user answered "I'm OK") and admin resolutions are stored (`trip_anomalies.user_response`, `alerts.status = 'false_alarm'`) and shown on the dashboard's AI-models page — material for retraining and for the report.

### 6.4 Groq usage policy (limits are tight)
1. **Never** on the SOS / alert critical path. Every Groq feature has a template fallback.
2. **Cache everything** (`llm_cache` table, key = sha256 of prompt). Same input never calls Groq twice.
3. **Rotate models** on 429 — each model has its own quota; honor `retry-after`.
4. Per-model token bucket (~25 req/min) in the ML API.
5. Batch jobs (dataset labelling) are throttled and resumable.
6. Short prompts, JSON output, small max_tokens.
7. Uses: alert summaries (H4, generated once per alert, on demand), labelling drafts for ML-6 training data.

---

## 7. Data model (Supabase)

Migrations live in `supabase/migrations/` (applied in order).

| Group | Tables |
|---|---|
| Users | `profiles`, `medical_cards`, `emergency_contacts`, `push_tokens` |
| SOS | `alerts`, `alert_locations`, `alert_events`, `evidence`, `guardian_responses` |
| Journeys | `trips`, `trip_points`, `trip_anomalies` |
| Community | `reports`, `report_votes`, `report_comments` |
| Places | `safe_places`, `zones` |
| ML | `risk_cells`, `model_registry`, `llm_cache` |

Key rules:
- Locations are PostGIS `geography(Point, 4326)`.
- Row-Level Security on every table: users see their own rows; admins/moderators see all; guardians only reach alerts through a radius-limited RPC.
- Live-location sharing goes through a token RPC (`get_shared_alert(token)`), never a public table policy.
- Storage buckets: `evidence` (private, signed URLs), `report-media` (private), `avatars` (public).
- Realtime on `alerts`, `alert_locations`, `alert_events`, `reports`, `trip_anomalies`.
- Safety PIN / duress PIN are never stored on the server.

---

## 8. Security & privacy
- Audio is analysed on the phone; nothing is uploaded unless SOS is active.
- Location is shared only during a trip or SOS; share links expire.
- No secret keys in the app bundle (anon key only; RLS enforces access).
- Evidence files carry SHA-256 hashes recorded at upload time (tamper evidence; replaces the old blockchain idea).
- Risk scores describe *conditions* (time, lighting, reports), not communities; reasons are shown with every score (SHAP) and the report discusses bias/stigmatisation risks.

---

## 9. Refactor map (old repo → new)

| Old (`safestree_womensafety`) | New |
|---|---|
| `hooks/useShakeDetector.ts` | `features/sos/hooks/useShakeTrigger.ts` (fallback to ML-4) |
| `hooks/useLocation.ts`, `hooks/useContacts.ts` | `features/*/hooks/` |
| `components/SafeWalkTimer.tsx`, `FakeCallModal.tsx`, `SOSButton.tsx` | rebuilt on the new design system |
| `utils/routeMonitor.ts`, `utils/arrivalMonitor.ts` | `features/ride/services/` (multi-route corridor, background task) |
| `utils/cabSync.ts` | `features/ride/services/parseShare.ts` — **no invented destination/driver fallbacks** |
| `utils/emergencyEscalation.ts`, `utils/twilio.ts` | device SMS/call module + Edge Function push |
| `DATABASE_SETUP.sql` | `supabase/migrations/` (PostGIS, strict RLS) |
| `utils/shardeum.ts`, `GoogleMapWebView.tsx`, `bluetoothSOS.ts`, `MOCK_INCIDENT_DATA`, demo login | **dropped** |
| `expo-av` | `expo-audio` |

---

## 10. Roadmap

| Phase | Deliverable | Status |
|---|---|---|
| **0. Foundation** | Repo, docs, Supabase schema (applied + RLS smoke test `supabase/tests/rls_smoke.sql` passing), app/admin/ML-API skeletons, design tokens | **Done 2026-10-16** (EAS setup pending Expo account) |
| 1. Core safety | Auth + onboarding, contacts, SOS (button, countdown, device SMS/call, live link, audio evidence), push, admin live alerts | |
| 2. Prevent (ML-1/2) | City data pipelines, risk model + SHAP, `risk_cells`, heatmap, safest-route API + planner | |
| 3. Detect (ML-3/4) | Audio + motion models → TFLite → triggers with "Are you OK?" | |
| 4. Safe Ride (ML-5) | Share-intent, parser, monitoring service, heartbeat function, anomaly model | |
| 5. Community (ML-6) | Reports, feed, moderation, NLP classify/dedupe | |
| 6. Admin + triage (ML-8) | Triage queue, Groq summaries, analytics, model monitoring | |
| 7. Polish + report | Device testing, false-alarm tuning, metrics tables, demo video | |

---

## 11. What we need from you

| Item | Where to get it | Goes into |
|---|---|---|
| Supabase **Project URL** | Supabase → Project Settings → API | app, admin, ML API |
| Supabase **anon / publishable key** | same page | app, admin |
| Supabase **service_role / secret key** | same page (keep private) | ML API, Edge Functions only |
| Supabase **database connection string** (with password) | Project Settings → Database → Connection string (URI) | used once to apply migrations |
| Groq API key | console.groq.com → API Keys | ML API only |
| Expo account | expo.dev (free) | EAS builds |
| Firebase project (Spark, free) | console.firebase.google.com → add Android app `com.safesphere.app` → `google-services.json` | push notifications (Phase 1) |

All keys go into gitignored `.env` files; nothing secret is committed.
