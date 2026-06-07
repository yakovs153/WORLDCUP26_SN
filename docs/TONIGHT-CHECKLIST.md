# Tonight's deploy checklist — Cloud Functions migration

**Goal:** Move the live-sync, playground, and daily Tom run from GitHub Actions to Cloud Functions so we never depend on the user OAuth refresh token at runtime again. All code is already written and pushed; this is the deploy + wire-up only.

## Prerequisites (5 min)

1. **From personal laptop**, renew the Firebase CLI token one last time:
   ```bash
   npx firebase-tools login:ci --no-localhost
   ```
   Sign in with `yakovs@storenext.co.il`. Copy the `1//...` token it prints.

2. Update the GitHub secret `FIREBASE_REFRESH_TOKEN` with that new token (Settings → Secrets and variables → Actions).

3. In the same terminal, set the env var locally for the deploy:
   ```bash
   export FIREBASE_TOKEN="1//..."   # the same token
   ```

## Step 1: Set the three Firebase secrets (90 sec, one-time)

From the project root:

```bash
firebase functions:secrets:set FOOTBALL_DATA_TOKEN
# When prompted, paste your football-data.org token
# (same value already in GitHub Secrets as FOOTBALL_DATA_TOKEN — copy from there).

firebase functions:secrets:set GEMINI_API_KEY
# When prompted, paste your Gemini API key
# (same value already in GitHub Secrets as GEMINI_API_KEY — copy from there).

# Generate a random sync secret for Cloud Scheduler → Function auth:
firebase functions:secrets:set SYNC_SECRET
# When prompted, paste something random — e.g. a UUID from `uuidgen` or any
# 24+ character random string. Save this value somewhere; Cloud Scheduler
# jobs will need to send it as the X-Sync-Secret header (Step 3).
```

These secrets live in Google Secret Manager and are mounted into the functions at runtime.

## Step 2: Deploy the three Cloud Functions (~3 min)

```bash
firebase deploy --only functions --project world-cup-2026-c145b
```

You should see three deployed:
- `liveSync` (Europe-West1) — every-minute WC sync
- `playgroundLive` (Europe-West1) — every-5-min ESPN playground refresh
- `dailyJob` (Europe-West1) — daily counts + HoF + bonus awarding + Tom recap/coach

After deploy completes, the function URLs are visible in the output. They look like:
```
https://liveSync-<hash>-ew.a.run.app
https://playgroundLive-<hash>-ew.a.run.app
https://dailyJob-<hash>-ew.a.run.app
```

**Copy these three URLs.** Cloud Scheduler will target them in the next step.

## Step 3: Update Cloud Scheduler to call the functions (4 min)

In **Cloud Console → Cloud Scheduler**, click **wc-live-sync** → **Edit job**:
- Change **URL** from the GitHub dispatch URL to the new `liveSync` function URL.
- Replace existing Headers with these two:
  - `X-Sync-Secret: <the SYNC_SECRET value you generated above>`
  - `Content-Type: application/json`
- **Body**: leave empty (or `{}`).
- Save.

Repeat for **wc-playground** with the `playgroundLive` URL.

Add a new third job for the daily run:
- **Name:** `wc-daily`
- **Frequency:** `0 6 * * *` (06:00 Israel time)
- **Time zone:** `Asia/Jerusalem`
- **URL:** the `dailyJob` function URL
- **Method:** POST
- **Headers:** same as above (X-Sync-Secret + Content-Type)
- **Body:** empty / `{}`

## Step 4: Verify (~2 min)

In Cloud Console → Cloud Scheduler, click the **⋮ menu** on each job → **Force run**.

Then in Cloud Console → Cloud Functions → click each function → **Logs** tab. You should see `"liveSync: { upserts: 104, ... }"` etc. Green status codes.

Also check Firestore:
```bash
gcloud firestore documents read snapshot/matches --format="value(updatedAt)"
```
Should be within the last minute.

## Step 5: Disable the old GitHub Actions cron jobs (1 min)

The old workflows (`live-sync.yml`, `playground.yml`, `pundit.yml`, `backup.yml`) still have their cron schedules. They'll keep firing as a redundant fallback, which is harmless — but they'll fail their auth step from now on (the user-token approach we're escaping), creating red runs in the Actions tab.

If you want to silence them, edit each `.github/workflows/*.yml` file and **comment out the `schedule:` block**, keeping only `workflow_dispatch:` so you can still run them manually if needed:

```yaml
on:
  # schedule:
  #   - cron: '*/5 * * * *'
  workflow_dispatch: {}
```

Or just delete the workflow files entirely. Either way, push and the noise goes away.

## What you've gained

- Sync, playground, and daily jobs all run as **the project's default service account** — no user OAuth token, no Workspace session rotation.
- Token renewal is now needed **only when you redeploy** function code, which is rare. Even then, you can do it from GitHub Actions OIDC if you prefer.
- Cloud Scheduler keeps the reliable minute-precise timing it already had.
- The `FIREBASE_REFRESH_TOKEN` secret is still useful for one-off `firebase deploy --only hosting` from your machine, but day-to-day operations no longer touch it.

## If anything goes wrong

- **Deploy fails with "API not enabled"**: just visit the URL it prints in the error — that auto-enables the API → re-run `firebase deploy --only functions`.
- **Function returns 401**: the `X-Sync-Secret` header is missing/mismatched in Cloud Scheduler. Compare exact characters; trailing spaces will fail.
- **Function returns 500**: check the function's logs in Cloud Console — almost always a missing secret value or a Firestore permission issue (rare with default service account).
- **Old GitHub Actions runs still going red after this**: ignore them, or comment out their `schedule:` blocks as in Step 5.
