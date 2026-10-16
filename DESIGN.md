# SafeSphere — Design System

Source of truth for the app and the admin dashboard. The approved concept lives in `design/mockup/` (canvas: Home, Safety map, Safe Ride, ride check-in, SOS, SOS active, Community, Admin dashboard).

## Direction
**Quiet until it matters.** Light grey ground, white rounded cards, grouped lists in the iOS Settings / Apple Health tradition. Almost everything is neutral ink on white; colour carries meaning only. The one loud element on any screen is SOS — and during an emergency the whole screen changes register (red tint band, pulsing status).

## Colour (light theme only)

| Token | Hex | Use |
|---|---|---|
| `ground` | `#F4F5F7` | App / page background |
| `card` | `#FFFFFF` | Cards, sheets, tab bar |
| `ink` | `#0E1726` | Primary text, primary buttons |
| `ink2` | `#4B5563` | Body secondary |
| `ink3` | `#626B79` | Captions, section labels (≥4.5:1 on white) |
| `iconMuted` | `#8A93A0` | Inactive tab icons only (not text) |
| `hairline` | `#E6E8EC` / `#EEF0F3` | Borders, list dividers |
| `fill` | `#F1F2F4` | Secondary buttons, bar tracks |
| `safe` | `#12A26B` · text `#067A55` · tint `#E9F6F0` | Safe status, toggles on, "on route" |
| `danger` | `#D92D3A` · text `#B42330` · tint `#FDEEEF` | SOS, high risk, alerts — nothing else |
| `warning` | `#E08A00` · text `#92400E` · tint `#FFF4E5` | Medium risk, ride anomaly |
| `info` | `#2563EB` · tint `#EAF1FF` | Safe places, links, user location, routes |

Rules: red appears only for SOS/danger. Risk colours differ in lightness, not just hue. Text on tints uses the darker "text" variant. Indian number plates use the real yellow-plate style (`#FCD34D` + ink border).

## Type
**Figtree** (400–800), one family everywhere.

| Style | Size / weight |
|---|---|
| Large title | 30–32 / 800, tracking −0.02em |
| Title | 19–24 / 800 |
| Headline | 15–16 / 700 |
| Body | 15–16 / 500 |
| Caption | 12–13 / 500–600, `ink3` |
| Section label | 13 / 700, uppercase, tracking +0.06em, `ink3` |
| Numbers | tabular figures for scores, timers, plates |

## Shape & space
- Radii: chips/tags 8–12, buttons 16–18, cards 20–22, sheets 28 (top), alert dialogs 32, SOS = circle.
- Spacing scale: 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32. Screen gutter 16–20.
- Touch targets ≥ 44 px; primary buttons 50–56 px tall.
- Shadows are barely there: `0 1px 2px rgba(16,24,40,.05)` on cards; floating map controls `0 4px 14px rgba(16,24,40,.08)`; sheets `0 -8px 30px rgba(16,24,40,.10)`.

## Components
- **Tab bar:** white, 84 px, hairline top; Home · Map · raised red SOS circle (62 px, white ring) · Community · Profile. Active = ink + 700, inactive = `iconMuted`.
- **Card:** white, radius 20–22, padding 16–18.
- **Grouped list:** white card, rows 52–56 px, 32 px rounded-square icon chip on `ground`, hairline dividers, trailing toggle/value.
- **Toggle:** 48×29, on = `safe`, knob white.
- **Buttons:** primary ink/white; danger red/white (SOS actions only); secondary `fill`/ink.
- **Chips:** 34–38 px pills; selected = ink fill or 2 px ink outline.
- **Bottom sheet:** white, 28 px top radius, 36×5 grab handle.
- **Score badge:** rounded square with tint background, big number + tiny uppercase level.
- **Icons:** Lucide (stroke 1.8, round caps) in both app and dashboard. No emoji.

## Motion
Purposeful, quick, calm. Reanimated in the app; Motion in the dashboard. Everything respects reduce-motion (then: no animation, instant state).

| Moment | Motion |
|---|---|
| Screen content | fade + rise 10–12 px, 400–600 ms, ease-out `cubic-bezier(.2,.8,.2,1)`, stagger 60–80 ms |
| Risk ring | stroke draws in, 1.4 s |
| Bottom sheet | slide up with slight spring overshoot |
| Button press | scale to 0.97 + light haptic |
| SOS idle | two concentric rings pulse outward, 2.6 s, offset |
| SOS hold | progress ring fills over 3 s; heavy haptic on completion |
| AI check-in | countdown ring depletes linearly; vibration pattern |
| SOS active | status dot beats (1.2 s), timeline steps appear in sequence, audio waveform |
| Map | user dot halo pulse, heatmap breathes slowly, route draws itself |

## Admin dashboard
Same tokens. Sidebar (white, 220 px) + fluid content; stat tiles, priority queue cards tinted by severity (red / amber / neutral), MapLibre map panel, tables in scrollable boxes. Collapses to a top bar on narrow screens.
