# Mundial 2026 — Redesign + Live Data (Phase 0 + 1) — Design Spec

**Date:** 2026-06-04
**Status:** Draft for review
**Scope:** Combined Phase 0 (visual redesign + fun layer) and Phase 1 (real schedule + Firebase go-live + live sync). Phases 2–4 (Teams/Flags hub, Golden Boot cards, mini-leagues, bracket, live room, AI pundit) are out of scope here and get their own specs.

---

## 1. Goals

1. Transform the UI from "generic" into a **"wow", fun-but-professional** experience using the **Glass & Depth** direction, with **dark + light themes and a toggle**.
2. Use **real national-team flags** everywhere.
3. Add a **fun layer**: confetti on correct picks, live "points-in-flight", team-colour gradient ring on the picked team, streak flames + level badges.
4. Load the **real 2026 World Cup schedule** (48 teams, 104 matches), one-time now.
5. **Go live on Firebase** so colleagues share one app: auth, shared leaderboard, predictions.
6. **Live results**: auto-sync from a football API as matches play and finish, with an **admin manual override** so a score is never stuck.

### Non-goals (this phase)
Teams & Flags hub, Golden Boot/player cards, mini-leagues, bracket, live match room, AI pundit. The redesign will leave clean seams for them.

---

## 2. Design System & Theming

### 2.1 Two layers of colour
- **Brand tokens** (`--color-primary`, `--color-accent`, `--color-danger`) — StoreNext red/amber. Admin-configurable via existing `AppConfig.theme`; unchanged by light/dark mode.
- **Surface tokens** (`--color-bg*`, `--color-surface*`, `--color-text*`, `--color-border*`, glass vars) — these **swap with the theme mode**.

### 2.2 Theme mode (new)
- `<html data-theme="dark|light">`. `tokens.css` defines both token sets under `:root[data-theme="dark"]` and `:root[data-theme="light"]`.
- New `ThemeModeProvider` (React context + `useThemeMode`): resolves initial mode from `localStorage('theme-mode')` → else `prefers-color-scheme` → else dark. Persists on change. Updates `<meta name="theme-color">`.
- **Toggle**: ☀/☾ pill in the Header (and on the Login screen). Animated thumb.
- `ThemeApplier` keeps applying the admin **brand** overrides on top, in both modes.
- **Light palette** (approved in mockups): `bg #f4eef7`, surface `rgba(255,255,255,.72)` frosted, text `#1a1320`, muted `#6b5b70`, warm amber + red glows. Dark palette stays the deep-plum set already in `tokens.css`.

### 2.3 Glass & Depth aesthetic
- New utility classes in `global.css`: `.glass` (translucent bg, `backdrop-filter: blur`, hairline border, soft shadow — values per theme), `.glow-bg` (positioned blurred colour orbs behind content), `.card-3d` (subtle hover lift).
- Score divider uses the **StoreNext cube SVG** motif.
- Motion: respect `prefers-reduced-motion` (disable confetti/animation when set).

### 2.4 Components touched
Header (+toggle, glass), BottomNav (glass, active-glow), Layout (glow-bg background), MatchCard (glass card, gradient ring, live badge, points-in-flight), ScoreInput (polished steppers), LiveBadge (pulse), NextMatchHero (countdown polish), Login/Register (glass + toggle), Skeletons. **No routing/page-structure changes.**

---

## 3. Fun Layer

| Effect | Trigger | Implementation |
|---|---|---|
| **Confetti** | A finished match where the user's prediction scored > 0 (esp. exact) | Tiny self-contained canvas burst (no heavy dep); fired once per match-result reveal; gated by `prefers-reduced-motion`. |
| **Points-in-flight** | A `LIVE` match the user predicted | Compute *potential* points live from current score via existing `scoring.ts`; show animated `🎯 +N בדרך!` badge that re-animates when score changes. |
| **Gradient ring** | User has a prediction on a match | The team the user backed to win gets a national-colour gradient ring around its flag/badge. |
| **Streak flames + level badges** | Profile | Compute current/best streak of correct calls from finished predictions; show 🔥 streak and a level badge derived from `totalPoints`. Pure client computation. |

All four work in **demo mode** and live mode.

---

## 4. Flags

- Replace emoji flags with **flag images** via existing `lib/countryFlags.ts` `flagUrl()` (flagcdn.com). Audit/extend the FIFA-code→ISO2 map to cover all 48 finalists.
- `FlagIcon` component becomes the single source; used in MatchCard, ScoreInput, pickers, leaderboard, NextMatchHero.
- Flag-coloured accents: the gradient ring (above) uses `COUNTRY_COLORS` (extend `lib/players.ts` map to all 48). Subtle flag-wave/celebration when a backed team wins.
- Emoji kept only as ultimate fallback if an image fails to load.

---

## 5. Data & Backend (Phase 1)

### 5.1 Real schedule (one-time)
- Source of truth = the football API (`competitions/WC/matches`). After deploy, call **`syncMatchesNow`** once to populate the real 48-team, 104-match schedule into `matches/`.
- Provide a **static fallback seed** (`scripts/seed-matches.mjs` extended with the official 2026 fixture list) in case the free API's schedule is incomplete, so we can seed without waiting on the API.
- Map API → our `Match` type (existing `mapStage`/`mapStatus` in `footballApi.ts`). Store team `crest` URL alongside flag.

### 5.2 Firebase deployment
- Services: **Auth** (Email/Password + Google), **Firestore**, **Functions** (`europe-west1`, already configured), **Hosting**. Requires **Blaze**.
- `.env.local` filled with the project's Web SDK config; `VITE_DEMO_MODE=false` for the deployed build. Local dev keeps demo mode + the placeholder-safe `firebase.ts` fix already applied.
- First admin + allowed domain seeded into `appConfig/main` (`adminEmails`, `allowedEmailDomains`).

### 5.3 Live sync + scoring (mostly exists)
- `syncMatches` (cron 6h) — refresh fixtures. `pollLiveResults` (cron 2m) — update `status` + scores for in-play/just-finished matches. `onMatchFinished` — compute & write prediction points and bump `users.totalPoints`. Review/verify these against the live API response and our types; fix gaps.

### 5.4 Admin manual override (new)
- New **Admin → "Matches"** tab: list matches; create/edit a match; set status (`SCHEDULED/LIVE/FINISHED`) and score manually.
- `matches/` is rules-locked to Functions only, so admin writes go through **callable functions** `adminUpsertMatch` / `adminSetMatchScore`, guarded by the same admin-email check used in rules.
- Add `manualLock: boolean` to a match: when true, `pollLiveResults` **skips** it so auto-sync never clobbers a hand-entered score. Setting a manual score sets `manualLock`; an "unlock / resume auto" button clears it.
- Manually setting status to `FINISHED` triggers the same scoring path as auto-finish.

### 5.5 Security rules
- Unchanged model: `matches` write:false (Functions/callables only); predictions owner-only & pre-kickoff (existing). Verify rules still pass with new fields (`manualLock`, `lastUpdated`). No new client-writable collections this phase.

---

## 6. Demo-mode parity
Every redesigned screen and all four fun effects work with `VITE_DEMO_MODE=true` (localStorage). To exercise live UI locally, `demoData.ts` gains a small **"simulate live"** helper that nudges one fixture into `LIVE` with a ticking score (dev only). This keeps local verification possible without the backend.

---

## 7. External prerequisites (user-provided, can proceed in parallel)
| Need | For | Notes |
|---|---|---|
| Firebase project + **Blaze** | 5.2 | Likely ~$0 at office scale; needs billing card |
| **football-data.org** API key (free) | 5.1/5.3 | Stored as Functions secret `FOOTBALL_DATA_TOKEN`; admin override covers gaps |
| **StoreNext logo** files | Header/PWA icons | `public/logo.png` + square; icons generated from it |

If credentials aren't ready when the code is, Phase 0 (redesign + fun + flags + demo) ships and verifies immediately; Phase 1 deploy/live-verify happens the moment they land.

---

## 8. Verification
- **Type/build**: `tsc -b && vite build` clean.
- **Local render** (preview tools are constrained in this env): headless-Chrome DOM/console checks on key routes in both themes — confirm render, no console errors, theme toggle swaps tokens, flags load, fun effects fire on a simulated finished/live match.
- **Post-deploy** (once credentials land): `syncMatchesNow` populates real fixtures; force one match `LIVE` then `FINISHED` and confirm scores + leaderboard update; admin manual override skips the poller.

---

## 9. Risks & mitigations
- **football-data free tier may lag/limit WC live data** → admin manual override is the guaranteed path; provider is swappable.
- **Blaze billing** is a company decision → Phase 0 is fully usable without it.
- **Light-on-glass contrast** (accessibility) → tuned palette + contrast check on text over frosted surfaces.
- **Logo missing** → text wordmark + cube SVG placeholder until the file arrives.
- **Big diff** → land Phase 0 first (verifiable in demo), then Phase 1, in reviewable chunks.

---

## 10. Open items for the implementation plan
- Exact light-theme token values (start from mockup palette, tune for contrast).
- Confirm football-data free tier returns the full 2026 bracket; otherwise compile the static seed.
- Confetti: hand-rolled vs a ~2KB helper.
