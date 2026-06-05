# Deploy — free tier (no credit card / no Blaze)

Architecture: **Firebase Spark (free)** for Auth + Firestore + Hosting, and a **free GitHub Actions cron** for live results (instead of Cloud Functions). Cost: ₪0.

The steps marked 🧑 only you can do (Google login / billing-free project / GitHub). Everything else is already built.

## 1. 🧑 Create the Firebase project (free)
1. https://console.firebase.google.com → **Add project** (name e.g. `storenext-mundial`). Disable Analytics if you like. **Do NOT enable Blaze** — Spark is fine.
2. **Build → Authentication → Get started** → enable **Email/Password** and **Google**.
3. **Build → Firestore Database → Create database** → **Production mode** → pick region `eur3` (Europe).
4. **Project settings (⚙) → General → Your apps → Web (`</>`)** → register app → copy the `firebaseConfig` values.

## 2. Web SDK config → `.env.local`
Paste the values and flip demo off:
```
VITE_DEMO_MODE=false
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_STORAGE_BUCKET=…
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=…
```
(Send me these and I'll fill it in + deploy for you.)

## 3. 🧑 Service-account key (for sync + setup)
**Project settings → Service accounts → Generate new private key** → save the JSON (keep it secret).

## 4. Initialise config + seed the schedule (one-time)
```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content path\to\serviceAccount.json -Raw
$env:FOOTBALL_DATA_TOKEN = "<your-football-data-token>"   # keep secret — never commit
node scripts/init-config.mjs    # admins: yakovs@ + dors@storenext.co.il, domain storenext.co.il
node scripts/sync-live.mjs      # seeds all 104 fixtures into Firestore
```

## 5. Deploy hosting + rules
```powershell
npm i -g firebase-tools
firebase login
firebase use --add               # pick the project, alias "default"
npm run build
firebase deploy --only hosting,firestore
```
> If `firebase`/node fails with a TLS/self-signed-cert error on this network, set
> `$env:NODE_EXTRA_CA_CERTS` to the corporate root CA, or run from an off-network machine.

## 6. 🧑 GitHub Actions live-sync (free cron)
1. Create a GitHub repo and push this project.
2. Repo **Settings → Secrets and variables → Actions → New repository secret**:
   - `FOOTBALL_DATA_TOKEN` = your token
   - `FIREBASE_SERVICE_ACCOUNT` = the full service-account JSON
3. The workflow `.github/workflows/live-sync.yml` then runs **every 5 minutes**, updating live scores and scoring finished matches. You can also trigger it manually from the **Actions** tab.

## Notes
- **Admin manual override**: the Admin → משחקים tab writes scores directly to Firestore (allowed for admin emails). A manual score sets `manualLock` so the cron won't overwrite it; press **↻** to resume auto-sync. A manual FINISHED is scored on the next cron run (≤5 min).
- **Switching to Blaze later** (real-time, push-based): restore the `functions` block in `firebase.json` and `firebase deploy` the `functions/` codebase — that path is already coded.
