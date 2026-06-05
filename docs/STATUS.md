# Mundial 2026 — Status & Handoff

_Last autonomous session. Everything below is built, type-checks, and the production build passes. Preview locally at **http://localhost:5173/?demo=1&sim=1** (`?sim=1` seeds a live + finished game and goal tallies so the fun layer is visible)._

## ✅ What's done (all in demo + deploy-ready)

| Area | Where | Notes |
|---|---|---|
| Glass & Depth redesign, dark/light toggle | everywhere | ☀/☾ in header + login; `?theme=` override |
| Fun layer | match cards / profile | confetti, live points-in-flight, team-colour ring (now a rectangular border), 🔥 streak + level |
| Real flags + 104-match real schedule | all | Hebrew team names; `src/data/wc2026.json` via `scripts/fetch-schedule.mjs` |
| Live-connection status | Matches tab | live / connected / snapshot |
| Admin "Matches" tab | פאנל ניהול | manual score/status override (`manualLock`) |
| Teams & Flags hub | בתים tab | 12 groups + live standings; bracket link; Golden Boot race **below** groups |
| Golden Boot | בונוס (pick) + בתים (watch) | glass cards, **real Wikimedia player faces**; pick is one-time, race is read-only |
| Admin remove players | פאנל ניהול → שחקנים | hide/restore built-in candidates (`hiddenScorers`) |
| Mini-leagues | דירוג tab → "הליגות שלי" | create / join by code / per-league standings |
| Road-to-the-Final bracket | /bracket (link in בתים) | knockout rounds, fills in green/red; TBD until groups end |
| Live match room | 💬 on each match card → /match/:id | emoji reactions + chat (realtime in prod, localStorage in demo) |
| Shareable result card | פרופיל → "שתף כרטיס תוצאה" | branded PNG via canvas, Web Share/download — no backend needed |
| AI pundit | Matches tab (if present) | `scripts/ai-pundit.mjs` + daily workflow; **needs ANTHROPIC_API_KEY** |

## ⚠️ Decisions I made for you (override anytime)
- **Admin emails**: `yakovs@` + `dors@storenext.co.il`; **domain** `storenext.co.il` (in `scripts/init-config.mjs`).
- **Demo leagues** seed a few demo rivals so standings look alive; real leagues start with just you.
- **Player photos**: Wikimedia Commons thumbnails (CC-licensed). One nominee (Ndiaye/Senegal) was dropped — no reliable photo.
- **AI pundit** shows a canned line in demo; real lines need the API key + the workflow running.
- **Golden Boot goals**: demo seeds a few; in production they read `stats/goldenBoot` — auto-population from the live feed isn't wired (English API names vs Hebrew nominees). Admin can set them, or we add a name-map later.

## 🚦 To publish the live URL — what I need from you
I **cannot** create the project, toggle console settings, or log into your Google account. Do these and I'll finish autonomously next session:

1. **Firebase console** (project `world-cup-2026-c145b`):
   - Authentication → enable **Email/Password** + **Google**
   - Firestore → **Create database**, production mode, region **eur3**
2. **Service-account key** → save as `C:\dev\storenext-mundial-2026\secrets\serviceAccount.json`
   (Project settings → Service accounts → Generate new private key)

With those, I can (no Google login needed — the CLI uses the service account):
`init-config` → seed 104 fixtures → `firebase deploy --only hosting,firestore` → **live URL** working on phone + PC.

3. **For live scores + pundit** (optional but recommended): create a **GitHub repo**, push, add Actions secrets:
   - `FOOTBALL_DATA_TOKEN`, `FIREBASE_SERVICE_ACCOUNT` (live-sync), and `ANTHROPIC_API_KEY` (pundit).

> Heads-up: `firebase deploy` from this machine may hit the corporate TLS proxy (self-signed cert). If it does, I'll set `NODE_EXTRA_CA_CERTS`/`NODE_TLS_REJECT_UNAUTHORIZED` or we deploy from an off-network machine. Full steps: `docs/DEPLOY-free.md`.

## Remaining / nice-to-have
- Auto-populate Golden Boot goals from the live feed (name-map).
- Reveal all members' predictions in the match room (currently shows your own).
- Polish secondary screens (MyPredictions, Register, Rules) — they inherit the glass theme but aren't individually art-directed.
