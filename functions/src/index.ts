/**
 * Cloud Functions entry point.
 *
 * The three exports below mirror our proven scripts under /scripts and replace
 * the GitHub Actions cron workflows for live ops. Triggered by Cloud Scheduler
 * via HTTPS with a shared X-Sync-Secret header.
 *
 * Runtime auth uses the project's default service account — no user refresh
 * token is in the auth chain, so they survive Workspace session rotation.
 *
 * The older drafts (syncMatches/pollLiveResults/onMatchFinished/...) predate
 * the snapshot doc, Tom auto-fill, penalty handling, and Hebrew names. They're
 * intentionally not exported — see scripts/sync-live.mjs git history for why.
 */
import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()
setGlobalOptions({ region: 'europe-west1' })

export { liveSync } from './liveSync'
export { playgroundLive } from './playgroundLive'
export { dailyJob } from './dailyJob'
