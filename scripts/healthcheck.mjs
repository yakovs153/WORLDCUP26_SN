#!/usr/bin/env node
/**
 * Pre-flight health check for the WC2026 stack.
 *
 * Usage:
 *   node scripts/healthcheck.mjs
 *
 * Set these env vars (or paste into PowerShell as `$env:NAME = "value"`):
 *   FOOTBALL_DATA_TOKEN  — football-data.org API token
 *   GEMINI_API_KEY       — Google AI Studio key
 *   SYNC_SECRET          — Cloud Functions shared secret
 *
 * To pull the secrets without typing them:
 *   gcloud secrets versions access latest --secret=FOOTBALL_DATA_TOKEN --project=world-cup-2026-c145b
 *   gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=world-cup-2026-c145b
 *   gcloud secrets versions access latest --secret=SYNC_SECRET --project=world-cup-2026-c145b
 */

const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m'
}
const ok   = (msg) => console.log(`${C.green}✓${C.reset} ${msg}`)
const bad  = (msg) => console.log(`${C.red}✗${C.reset} ${msg}`)
const warn = (msg) => console.log(`${C.yellow}⚠${C.reset} ${msg}`)
const info = (msg) => console.log(`${C.dim}  ${msg}${C.reset}`)
const head = (msg) => console.log(`\n${C.bold}${C.cyan}${msg}${C.reset}`)

const URLS = {
  liveSync:       'https://livesync-62a2xajn5a-ew.a.run.app',
  playgroundLive: 'https://playgroundlive-62a2xajn5a-ew.a.run.app',
  dailyJob:       'https://dailyjob-62a2xajn5a-ew.a.run.app',
  hosting:        'https://storenext-wc2026.web.app',
  footballData:   'https://api.football-data.org/v4/competitions/WC/matches',
  gemini:         'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent'
}

const SYNC_SECRET = process.env.SYNC_SECRET
const FOOTBALL_TOKEN = process.env.FOOTBALL_DATA_TOKEN
const GEMINI_KEY = process.env.GEMINI_API_KEY

let okCount = 0
let badCount = 0
let warnCount = 0

async function timed(fn) {
  const t0 = Date.now()
  try {
    const result = await fn()
    return { ...result, ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, error: e.message || String(e), ms: Date.now() - t0 }
  }
}

async function checkHosting() {
  head('🌐 Hosting')
  const res = await timed(async () => {
    const r = await fetch(URLS.hosting, { redirect: 'follow' })
    const body = await r.text()
    const hasHebrew = /[֐-׿]/.test(body)
    const hasReactRoot = body.includes('<div id="root">')
    return { ok: r.ok && hasReactRoot, status: r.status, hasHebrew, hasReactRoot }
  })
  if (res.ok) {
    ok(`Hosting reachable — ${res.status} (${res.ms}ms)`)
    info(`React root: ${res.hasReactRoot ? 'yes' : 'no'} · Hebrew content: ${res.hasHebrew ? 'yes' : 'no'}`)
    okCount++
  } else {
    bad(`Hosting failed — ${res.error || `status ${res.status}`}`)
    badCount++
  }
}

async function checkCloudFunction(name, url) {
  if (!SYNC_SECRET) {
    warn(`${name}: skipped (SYNC_SECRET not set)`)
    warnCount++
    return
  }
  const res = await timed(async () => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'X-Sync-Secret': SYNC_SECRET },
      // dailyJob may take longer; allow it
      signal: AbortSignal.timeout(60_000)
    })
    let body = {}
    try { body = await r.json() } catch { /* non-JSON */ }
    return { ok: r.ok, status: r.status, body }
  })
  if (res.ok) {
    ok(`${name} responded — ${res.status} (${res.ms}ms)`)
    if (res.body && Object.keys(res.body).length) {
      const pretty = Object.entries(res.body).filter(([k]) => k !== 'ok')
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')
      if (pretty) info(pretty)
    }
    okCount++
  } else {
    bad(`${name} failed — ${res.error || `status ${res.status}`}`)
    if (res.body && res.body.error) info(`error: ${res.body.error}`)
    badCount++
  }
}

async function checkFootballData() {
  head('⚽ football-data.org')
  if (!FOOTBALL_TOKEN) {
    warn('skipped (FOOTBALL_DATA_TOKEN not set)')
    warnCount++
    return
  }
  const res = await timed(async () => {
    const r = await fetch(URLS.footballData, { headers: { 'X-Auth-Token': FOOTBALL_TOKEN } })
    const body = await r.json()
    return { ok: r.ok, status: r.status, count: body.matches?.length ?? 0, message: body.message }
  })
  if (res.ok) {
    ok(`football-data token valid — ${res.count} matches in WC competition (${res.ms}ms)`)
    okCount++
  } else {
    bad(`football-data failed — ${res.status}: ${res.message || res.error}`)
    badCount++
  }
}

async function checkGemini() {
  head('🤖 Gemini')
  if (!GEMINI_KEY) {
    warn('skipped (GEMINI_API_KEY not set)')
    warnCount++
    return
  }
  const res = await timed(async () => {
    const r = await fetch(`${URLS.gemini}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'reply with the single word: ok' }] }] })
    })
    const body = await r.json()
    return { ok: r.ok, status: r.status, text: body.candidates?.[0]?.content?.parts?.[0]?.text, error: body.error?.message }
  })
  if (res.ok) {
    ok(`Gemini key valid — response received (${res.ms}ms)`)
    if (res.text) info(`reply: ${res.text.trim().slice(0, 60)}`)
    okCount++
  } else {
    bad(`Gemini failed — ${res.status}: ${res.error || 'unknown'}`)
    badCount++
  }
}

async function main() {
  console.log(`${C.bold}🏥 WC2026 Stack Health Check${C.reset}`)
  console.log(`${C.dim}Time: ${new Date().toISOString()}${C.reset}`)

  await checkHosting()

  head('☁️  Cloud Functions')
  await checkCloudFunction('liveSync', URLS.liveSync)
  await checkCloudFunction('playgroundLive', URLS.playgroundLive)
  await checkCloudFunction('dailyJob', URLS.dailyJob)

  await checkFootballData()
  await checkGemini()

  console.log()
  const total = okCount + badCount + warnCount
  const summary = `${C.green}${okCount} ok${C.reset} · ${C.red}${badCount} failed${C.reset} · ${C.yellow}${warnCount} skipped${C.reset}`
  console.log(`${C.bold}Summary:${C.reset} ${summary} (of ${total})`)

  if (badCount > 0) {
    console.log(`\n${C.red}${C.bold}⚠ Action required${C.reset} — see ✗ entries above.`)
    process.exit(1)
  } else if (warnCount > 0) {
    console.log(`\n${C.yellow}Some checks were skipped — provide env vars for full coverage.${C.reset}`)
    process.exit(0)
  } else {
    console.log(`\n${C.green}${C.bold}🏆 All systems go.${C.reset}`)
    process.exit(0)
  }
}

main().catch((e) => {
  console.error(`${C.red}Health check crashed:${C.reset}`, e)
  process.exit(2)
})
