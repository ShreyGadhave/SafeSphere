# SafeSphere — Android app

Expo **SDK 57** (React Native 0.86, Expo Router 57, Reanimated 4) — Android only.
The app needs a **development build**; it does not run in Expo Go (MapLibre, background
location, on-device ML and direct SMS are native modules Expo Go doesn't ship).

## Run it

```powershell
cd apps/mobile
copy .env.example .env        # fill in the Supabase URL + anon key
npm install

# 1) Build the dev client once (cloud build, free Expo account, no Android SDK needed)
npm run build:dev             # → install the APK it produces on your phone

# 2) Day to day: start Metro and open the dev client on the phone (same Wi-Fi)
npm start
```

Only rebuild the APK when a native dependency or `app.json` plugin changes. JS/TS changes
reload instantly.

Checks: `npm run typecheck`, `npm run lint`, `npm run doctor`.

## Structure

```
src/
  app/                 Expo Router routes ONLY — thin files that render a feature screen
    _layout.tsx        fonts, gesture handler, bottom-sheet provider, root Stack
    (tabs)/            Home · Map · SOS · Community · Profile (custom TabBar)
    (auth)/            sign-in, sign-up
    onboarding/        welcome → profile → contacts → pins → permissions
    ride/              Safe Ride + deviation check-in (modal)
    walk/, report/     Safe Walk, new community report
    sos-active.tsx, fake-call.tsx
  features/<feature>/  screens/, components/, hooks/, services/ per feature
                       (auth, home, map, sos, ride, walk, community, profile, contacts)
  components/ui/       design-system primitives (Text, Card, Button, ListRow, Toggle, Chip, TabBar…)
  theme/               tokens.ts (colors, type, spacing, radius, shadows, motion) + motion presets
  lib/                 env.ts (EXPO_PUBLIC_* config), supabase.ts (client)
```

## Conventions

- **Routes stay thin.** A file in `src/app/` only re-exports a screen from `src/features/…`.
- **Tokens only.** No raw hex values or font names in components — import from `@/theme`.
  Red (`danger`) is reserved for SOS/danger; see `/DESIGN.md`.
- **Motion** goes through Reanimated, uses `fadeInUp()` / `settleEasing`, and must respect
  reduced motion (`useReducedMotion`). Use `sharedValue.get()/.set()` (React Compiler is on).
- **Install packages with `npx expo install`** so versions match the SDK.
- **No secrets in the app.** Only `EXPO_PUBLIC_*` values; the service-role key lives server-side.
- Imports use the `@/` alias for `src/`.
- Home (`features/home`) is the reference implementation of the design system; other
  screens are Phase 0 placeholders listing what they will contain.
