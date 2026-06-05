# QA agent — end-to-end tests

Automated QA for the app, using Playwright + the system Chrome (no browser download).

## Run
```bash
npm run dev      # in one terminal (demo mode, port 5173)
npm run qa       # in another  (== playwright test)
```
(The config reuses an already-running dev server, or starts one.)

## What it checks (`qa/app.spec.ts`)
- **Every screen** (Matches, Teams, Bracket, Bonus, MyPredictions, Leaderboard, Profile, Admin, Rules, Lobby/TV in dark + light) renders content with **no console errors / uncaught exceptions**.
- **Flows**: theme toggle, save a prediction, leaderboard departments toggle, bonus picks (champion + finalists + surprise) save, match-room message send, opening every admin tab.

It runs against the **demo build** (`?demo=1` auto-login, `?sim=1` seeds a live + finished game, a Joker target, and goal tallies) so it needs no real auth or backend.

## Adding tests
Add `*.spec.ts` files in `qa/`. Use `watchErrors(page)` (in `app.spec.ts`) to assert a screen is error-free. Selectors are by Hebrew text/role; add `data-testid` attributes if a selector gets brittle.

## CI
Can run in GitHub Actions with `channel: 'chrome'` (or switch to the bundled `chromium`). Currently meant for local pre-deploy runs.
