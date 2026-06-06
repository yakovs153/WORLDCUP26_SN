# Cloud Scheduler — reliable scheduling for the live sync

GitHub Actions cron schedules can delay 15–60 minutes (sometimes more) under load.
Cloud Scheduler fires within seconds of the configured time. This guide moves the
schedule trigger from GitHub Actions to Cloud Scheduler, while still **running**
the work on GitHub Actions (no code needs to move).

The flow becomes:

```
Cloud Scheduler (reliable cron, every 1 min)
    └─→ HTTP POST → GitHub API repository_dispatch
            └─→ live-sync.yml workflow runs
```

The existing GitHub Actions cron stays in place as a fallback — if Cloud
Scheduler ever fails, the every-5-min `*/5` cron still kicks in.

---

## Prerequisites

1. **Firebase project on Blaze** (pay-as-you-go). Cloud Scheduler doesn't run on
   the free Spark plan. Realistic cost for our usage: **under $1/month** even
   with two jobs running every minute.
   - Attach billing: Firebase Console → ⚙️ Usage and billing → Modify plan → Blaze.
   - **Set a budget alert** immediately at Cloud Console → Billing → Budgets &
     alerts → Create budget → e.g. `$5/month` with notification at 50%/90%/100%.

2. **A GitHub fine-grained Personal Access Token (PAT)** that can trigger the
   workflow. Create at https://github.com/settings/tokens?type=beta:
   - **Resource owner:** yakovs153
   - **Repository access:** select **WORLDCUP26_SN** only
   - **Repository permissions:**
     - **Contents:** Read-only
     - **Metadata:** Read-only
     - **Actions:** Read & Write (this is what lets the PAT dispatch workflows)
   - **Expiration:** 90 days (set a calendar reminder to rotate)
   - **Generate** → copy the token (`github_pat_…`). Keep it; you'll paste it
     into the Scheduler job below.

---

## Create the Cloud Scheduler jobs

In **Cloud Console → Cloud Scheduler** (https://console.cloud.google.com/cloudscheduler)
make sure the project is `world-cup-2026-c145b`, then click **Create job**.

### Job 1 — WC live sync (every minute)

| Field | Value |
|---|---|
| Name | `wc-live-sync` |
| Region | `us-central1` (or closest to you) |
| Frequency | `* * * * *` (every minute) |
| Time zone | `Asia/Jerusalem` |
| **Target type** | HTTP |
| URL | `https://api.github.com/repos/yakovs153/WORLDCUP26_SN/dispatches` |
| HTTP method | POST |
| Body | `{"event_type":"run-sync"}` |
| Headers | `Authorization: Bearer github_pat_…` (your PAT) |
|         | `Accept: application/vnd.github+json` |
|         | `Content-Type: application/json` |
|         | `X-GitHub-Api-Version: 2022-11-28` |
|         | `User-Agent: cloud-scheduler` |

Click **Create**. The job will fire every minute; you'll see the GitHub Actions
"Live results sync" workflow runs appearing under Actions tab almost immediately
each minute (delay: seconds, not minutes).

### Job 2 — Playground (every 5 minutes)

Same as above, but:

| Field | Value |
|---|---|
| Name | `wc-playground` |
| Frequency | `*/5 * * * *` |
| Body | `{"event_type":"run-playground"}` |

(Playground doesn't need per-minute updates — 5 min is plenty for testing.)

---

## Verify it's working

After ~2 minutes:

1. GitHub → repo → **Actions** tab → you should see "Live results sync" runs
   firing every minute, each tagged with `repository_dispatch`.
2. Open https://storenext-wc2026.web.app and check the home/match cards — they
   should update within seconds of changes in the football-data feed.

---

## Cost reality check

Cloud Scheduler pricing: **3 free jobs per month**, then $0.10/job/month. Two
jobs = free. The actual HTTP calls and GitHub API requests are also free.

**Total expected cost: $0/month** for this setup. The Blaze plan only charges
for usage beyond the generous free tiers, which we don't hit.

---

## Latency expectations (the "real-time" question)

End-to-end latency from a real-world goal to your phone:

| Step | Typical latency |
|---|---|
| Real event → football-data picks it up | 5–30 s |
| Cloud Scheduler fires next minute | up to 60 s |
| GitHub API → workflow starts | 1–5 s |
| Node script: fetch + write to Firestore | 5–10 s |
| Firestore → client `onSnapshot` | <1 s |

**Realistic worst case: ~90 seconds. Typical: 30–60 seconds.**

This is as "real-time" as we can get without paying for football-data's premium
plan (which offers push/webhook delivery). For a free internal pool, sub-minute
freshness is excellent.

If you want true sub-10s updates during a match, use **live mode** instead —
**Actions → "Live results sync" → Run workflow → live_minutes = 120**. That
single run polls every 60 seconds for 2 hours. The cron-based approach above is
for "background" coverage.
