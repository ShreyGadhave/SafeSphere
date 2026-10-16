# SafeSphere Admin Dashboard

Web dashboard for police, NGO partners and SafeSphere moderators: live SOS alerts
sorted by AI triage score, Safe Ride trips, report moderation, risk map, guardians,
analytics and model monitoring.

Stack: React 19 + Vite 8 + TypeScript, Tailwind CSS v4 (CSS-first tokens), React Router
(library mode), Motion, MapLibre GL JS with free OpenFreeMap tiles (no API key),
Supabase JS, lucide-react icons.

## Run

```powershell
cd apps/admin
npm install
copy .env.example .env      # fill in Supabase keys; or set VITE_DEV_BYPASS_AUTH=true for UI-only work
npm run dev                 # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and production build to `dist/` |
| `npm run lint` | Oxlint |
| `npm run preview` | Serve the production build |

## Environment

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon / publishable key (safe in the browser; RLS protects data) |
| `VITE_ML_API_URL` | FastAPI ML service (`services/ml-api`) |
| `VITE_DEV_BYPASS_AUTH` | `true` skips the admin sign-in gate for local UI work only |

Never put the Supabase service-role key in this app.

## Structure

```
src/
  app/          App, router, providers, RequireAdmin route guard
  layouts/      AdminLayout (sidebar -> top bar below lg), nav items
  pages/        One folder per route: LiveAlerts, Trips, Reports, RiskMap,
                Guardians, Analytics, Models, SignIn, NotFound
  components/
    ui/         Card, Button, Badge, StatTile, PageHeader, Table
    map/        BaseMap (MapLibre + OpenFreeMap)
    brand/      Logo
  lib/          env (typed, lazy), supabase client, motion variants, cn
  styles/       theme.css: Tailwind v4 @theme design tokens
  types/        Domain types mirroring the Supabase schema
```

## Conventions

- **Design tokens only.** Colors, radii and fonts come from `src/styles/theme.css`
  (`bg-ground`, `text-ink-2`, `bg-danger-soft`, `rounded-card`, ...). Red is reserved for
  SOS / high risk, green for OK status, amber for medium risk and ride anomalies, blue for
  links, safe places and guardians. Light theme only. Full rules: `../../DESIGN.md`.
- **Imports** use the `@/` alias for `src/`.
- **Pages** own their sub-components and data (`pages/LiveAlerts/*`); move a component to
  `components/` only when a second page needs it.
- **Motion** uses the shared variants in `lib/motion.ts` (staggered fade-up). `MotionConfig
  reducedMotion="user"` plus a CSS media query turn animation off when the OS asks.
- **Sample data** lives in `sampleData.ts` files and is labelled "Sample data" in the UI.
  Search for `TODO(live-data)` to find what to replace with Supabase queries.
- **Auth:** `RequireAdmin` checks the Supabase session and `profiles.role` (admin or
  moderator). Row-level security in the database is the real protection.
