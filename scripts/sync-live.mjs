/**
 * Live-sync worker — runs on a GitHub Actions cron (free; no Cloud Functions / Blaze).
 *
 * Each run:
 *   1. Fetches the FIFA WC 2026 matches from football-data.org.
 *   2. Upserts fixtures + live status/score into Firestore (skips matches an admin
 *      has manually locked via `manualLock`).
 *   3. Scores predictions for matches that just FINISHED (idempotent), updates each
 *      user's totalPoints, and recomputes predictionsCount.
 *
 * Env:
 *   FOOTBALL_DATA_TOKEN       — football-data.org API token
 *   FIREBASE_SERVICE_ACCOUNT  — service-account JSON (string), OR set
 *   GOOGLE_APPLICATION_CREDENTIALS to a key file path.
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Hebrew team names keyed by FIFA code — the API serves English, we display Hebrew.
const __dir = dirname(fileURLToPath(import.meta.url))
const HE_TEAMS = JSON.parse(readFileSync(join(__dir, '..', 'src', 'data', 'heTeams.json'), 'utf8'))
const heName = (tla, fallback) => (tla && HE_TEAMS[tla.toUpperCase()]) || fallback || ''

// Tom the Analyst — bookmaker-favourite picks with realistic VARIETY. Same
// match always gets the same pick (deterministic hash); admin can override.
const STRENGTH = JSON.parse(readFileSync(join(__dir, '..', 'src', 'data', 'teamStrength.json'), 'utf8'))
const strengthOf = (code) => STRENGTH[(code || '').toUpperCase()] ?? 3
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0 } return h >>> 0 }
const HOME_BIG = [[2,0],[3,0],[3,1],[2,1],[4,1]]
const HOME_COMFORT = [[2,1],[2,0],[1,0],[3,1],[3,0]]
const HOME_SLIGHT = [[1,0],[2,1],[1,1],[2,0],[0,0]]
const EVEN_MATCH = [[1,1],[1,0],[0,0],[2,1],[0,1],[2,2],[1,2]]
const AWAY_SLIGHT = [[0,1],[1,2],[1,1],[0,2],[0,0]]
const AWAY_COMFORT = [[1,2],[0,2],[0,1],[1,3],[0,3]]
const AWAY_BIG = [[0,2],[0,3],[1,3],[1,2],[1,4]]
function bucket(gap) {
  if (gap >= 2.0) return HOME_BIG
  if (gap >= 1.0) return HOME_COMFORT
  if (gap >= 0.4) return HOME_SLIGHT
  if (gap > -0.4) return EVEN_MATCH
  if (gap > -1.0) return AWAY_SLIGHT
  if (gap > -2.0) return AWAY_COMFORT
  return AWAY_BIG
}
function tomPick(homeCode, awayCode, matchId, overrides) {
  const ov = overrides?.[matchId]
  if (Array.isArray(ov) && ov.length === 2) return ov
  const gap = strengthOf(homeCode) + 0.3 - strengthOf(awayCode)
  const pool = bucket(gap)
  const weights = pool.map((_, i) => Math.max(1, pool.length - i))
  const totalW = weights.reduce((a, b) => a + b, 0)
  const r = hash(`${matchId}|${homeCode}|${awayCode}`) % totalW
  let acc = 0
  for (let i = 0; i < pool.length; i++) { acc += weights[i]; if (r < acc) return pool[i] }
  return pool[0]
}

const TOKEN = process.env.FOOTBALL_DATA_TOKEN
if (!TOKEN) { console.error('FOOTBALL_DATA_TOKEN missing'); process.exit(1) }

// Auth: Workload Identity Federation (keyless) provides Application Default
// Credentials in CI. A service-account JSON is still supported if ever available.
const saJson = process.env.FIREBASE_SERVICE_ACCOUNT
initializeApp(saJson
  ? { credential: cert(JSON.parse(saJson)) }
  : { credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

const STAGE = { GROUP_STAGE: 'GROUP', LEAGUE_STAGE: 'GROUP', LAST_32: 'R32', LAST_16: 'R16', QUARTER_FINALS: 'QF', SEMI_FINALS: 'SF', THIRD_PLACE: 'TP', FINAL: 'F' }
const statusOf = (s) =>
  s === 'IN_PLAY' || s === 'PAUSED' ? 'LIVE'
  : s === 'FINISHED' ? 'FINISHED'
  : s === 'POSTPONED' || s === 'SUSPENDED' || s === 'CANCELLED' ? 'POSTPONED'
  : 'SCHEDULED'

function scorePrediction(ph, pa, ah, aa, cfg) {
  const C = cfg || { exact: 5, winnerAndDiff: 3, winnerOnly: 1 }
  if (ph === ah && pa === aa) return C.exact
  const sign = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  if (sign(ph - pa) !== sign(ah - aa)) return 0
  if (ph - pa === ah - aa) return C.winnerAndDiff
  return C.winnerOnly
}

async function main() {
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', { headers: { 'X-Auth-Token': TOKEN } })
  if (!res.ok) { console.error(`API ${res.status}: ${await res.text()}`); process.exit(1) }
  const { matches: apiMatches } = await res.json()

  const cfgSnap = await db.collection('appConfig').doc('main').get()
  const scoringCfg = cfgSnap.exists ? cfgSnap.data()?.scoring : undefined
  const stageMult = cfgSnap.exists ? cfgSnap.data()?.stageMultipliers : undefined
  const overrides = cfgSnap.exists ? (cfgSnap.data()?.analystOverrides || {}) : {}
  const applyStage = (base, stage) => Math.round(base * ((stage && stageMult && stageMult[stage]) || 1))

  // Lightweight sync state (scored/autofilled flags) — ONE doc instead of reading
  // all 104 matches every run (keeps us under the free read quota).
  const stateSnap = await db.collection('appState').doc('syncState').get()
  const sState = stateSnap.exists ? (stateSnap.data() || {}) : {}
  const scoredFlag = sState.scored || {}
  const autofilledFlag = sState.autofilled || {}

  const batch = db.batch()
  let upserts = 0
  const finishedToScore = [] // { id, h, a, stage }
  const snap = new Map() // id -> lightweight item for the public snapshot doc

  for (const m of apiMatches) {
    const id = String(m.id)
    const status = statusOf(m.status)
    // fullTime = score after 90 (group) or after 120 incl. ET (knockout). Penalty
    // shootouts are NOT in fullTime — they live in score.penalties + score.winner.
    const hs = m.score?.fullTime?.home ?? null
    const as = m.score?.fullTime?.away ?? null
    const pH = m.score?.penalties?.home ?? null
    const pA = m.score?.penalties?.away ?? null
    const winner = m.score?.winner ?? null   // 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    const homeTeam = { name: heName(m.homeTeam.tla, m.homeTeam.shortName || m.homeTeam.name), code: m.homeTeam.tla || '', flag: '' }
    const awayTeam = { name: heName(m.awayTeam.tla, m.awayTeam.shortName || m.awayTeam.name), code: m.awayTeam.tla || '', flag: '' }
    const group = m.group ? String(m.group).replace('GROUP_', '') : null
    const stage = STAGE[m.stage] || 'GROUP'

    batch.set(db.collection('matches').doc(id), {
      homeTeam, awayTeam,
      kickoff: Timestamp.fromDate(new Date(m.utcDate)),
      stage, group, status, homeScore: hs, awayScore: as,
      penalties: (pH != null && pA != null) ? { home: pH, away: pA } : null,
      winner: winner ?? null,
      minute: m.minute ?? null,
      lastUpdated: Timestamp.now()
    }, { merge: true })
    upserts++

    snap.set(id, { id, homeTeam, awayTeam, kickoffMs: new Date(m.utcDate).getTime(), stage, group, status, homeScore: hs, awayScore: as, minute: m.minute ?? null, scorers: [] })

    if (status === 'FINISHED' && typeof hs === 'number' && typeof as === 'number' && scoredFlag[id] !== true) {
      finishedToScore.push({ id, h: hs, a: as, stage })
    }
  }
  await batch.commit()

  // ===== Live detail: minute + goalscorers for in-play matches =====
  for (const m of apiMatches) {
    if (statusOf(m.status) !== 'LIVE') continue
    try {
      const dres = await fetch(`https://api.football-data.org/v4/matches/${m.id}`, { headers: { 'X-Auth-Token': TOKEN } })
      if (!dres.ok) continue
      const detail = await dres.json()
      const goals = Array.isArray(detail.goals) ? detail.goals : []
      const scorers = goals
        .map((g) => ({
          name: g.scorer?.name || '',
          team: g.team?.id === detail.homeTeam?.id ? (detail.homeTeam?.tla || '') : (detail.awayTeam?.tla || ''),
          minute: g.minute ?? null
        }))
        .filter((s) => s.name)
      const minute = detail.minute ?? m.minute ?? null
      await db.collection('matches').doc(String(m.id)).set({ minute, scorers }, { merge: true })
      const item = snap.get(String(m.id)); if (item) { item.minute = minute; item.scorers = scorers }
    } catch { /* ignore detail errors */ }
  }

  // ===== Tom the Analyst auto-fill: anyone who forgot gets Tom's pick at kickoff =====
  // Admin can disable this via appConfig.features.analystAutofill === false.
  const analystAutofill = cfgSnap.exists ? cfgSnap.data()?.features?.analystAutofill !== false : true
  const nowMs = Date.now()
  const allUserIds = analystAutofill ? (await db.collection('users').get()).docs.map((d) => d.id) : []
  for (const m of apiMatches) {
    if (!analystAutofill) break
    const id = String(m.id)
    if (autofilledFlag[id] === true) continue
    if (new Date(m.utcDate).getTime() > nowMs) continue // not locked yet
    const have = new Set((await db.collection('predictions').where('matchId', '==', id).get()).docs.map((d) => d.data().uid))
    const [oh, oa] = tomPick(m.homeTeam.tla, m.awayTeam.tla, id, overrides)
    const fb = db.batch()
    for (const uid of allUserIds) {
      if (have.has(uid)) continue
      fb.set(db.collection('predictions').doc(`${uid}_${id}`), {
        uid, matchId: id, homeScore: oh, awayScore: oa, points: null, auto: true, submittedAt: Timestamp.now()
      })
    }
    await fb.commit()
    autofilledFlag[id] = true
  }

  // Score finished matches.
  const userDelta = new Map()
  for (const fm of finishedToScore) {
    const preds = await db.collection('predictions').where('matchId', '==', fm.id).get()
    await db.runTransaction(async (tx) => {
      for (const d of preds.docs) {
        const p = d.data()
        if (p.points !== null && p.points !== undefined) continue
        let pts = applyStage(scorePrediction(p.homeScore, p.awayScore, fm.h, fm.a, scoringCfg), fm.stage)
        if (p.auto) pts = Math.round(pts * 0.7) // Tom's auto-fill scores 70%
        tx.update(d.ref, { points: pts })
        userDelta.set(p.uid, (userDelta.get(p.uid) || 0) + pts)
      }
    })
    scoredFlag[fm.id] = true
  }
  for (const [uid, delta] of userDelta) {
    await db.collection('users').doc(uid).set({ totalPoints: FieldValue.increment(delta) }, { merge: true })
  }

  // NOTE: predictionsCount + Hall of Fame are recomputed once a day by
  // scripts/daily-stats.mjs (they read every prediction — too costly per 5-min run).

  // ===== Bonus lock = first game kickoff (earliest match), enforced by rules =====
  let earliest = null
  for (const m of apiMatches) { const t = new Date(m.utcDate).getTime(); if (earliest === null || t < earliest) earliest = t }
  if (earliest !== null) {
    await db.collection('appState').doc('timing').set({ bonusLockAt: Timestamp.fromMillis(earliest) }, { merge: true })
  }

  // ===== King of the hill (current leader) — drives the leader perk =====
  const topSnap = await db.collection('users').orderBy('totalPoints', 'desc').limit(1).get()
  if (!topSnap.empty && (topSnap.docs[0].data().totalPoints || 0) > 0) {
    const top = topSnap.docs[0]
    await db.collection('appState').doc('king').set({
      uid: top.id, name: top.data().displayName || 'משתמש', totalPoints: top.data().totalPoints || 0, updatedAt: Timestamp.now()
    })
  }

  // ===== Public snapshot — clients read ONE doc instead of all 104 matches =====
  await db.collection('snapshot').doc('matches').set({
    items: [...snap.values()].sort((a, b) => a.kickoffMs - b.kickoffMs),
    updatedAt: Timestamp.now()
  })

  // Persist scored/autofilled flags for next run (read as ONE doc).
  await db.collection('appState').doc('syncState').set({ scored: scoredFlag, autofilled: autofilledFlag, updatedAt: Timestamp.now() }, { merge: true })

  console.log(`sync ok: upserts=${upserts}, scored matches=${finishedToScore.length}, users updated=${userDelta.size}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
