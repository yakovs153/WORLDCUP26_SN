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

// The Octopus's deterministic, plausible pick for a match (0–3/side, total ≤ 5).
function octoPredict(matchId) {
  let h = 0
  for (let i = 0; i < matchId.length; i++) h = (h * 31 + matchId.charCodeAt(i)) >>> 0
  let home = h % 4
  let away = Math.floor(h / 4) % 4
  while (home + away > 5) { if (home >= away) home--; else away-- }
  return [home, away]
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
  const applyStage = (base, stage) => Math.round(base * ((stage && stageMult && stageMult[stage]) || 1))

  // Existing match docs (manualLock + scored flags).
  const existingSnap = await db.collection('matches').get()
  const existing = new Map(existingSnap.docs.map((d) => [d.id, d.data()]))

  const batch = db.batch()
  let upserts = 0, skipped = 0
  const finishedToScore = [] // { id, home, away }

  for (const m of apiMatches) {
    const id = String(m.id)
    const cur = existing.get(id)
    const status = statusOf(m.status)
    const hs = m.score?.fullTime?.home ?? null
    const as = m.score?.fullTime?.away ?? null

    if (cur?.manualLock === true) { skipped++; }
    else {
      batch.set(db.collection('matches').doc(id), {
        homeTeam: { name: heName(m.homeTeam.tla, m.homeTeam.shortName || m.homeTeam.name), code: m.homeTeam.tla || '', flag: '' },
        awayTeam: { name: heName(m.awayTeam.tla, m.awayTeam.shortName || m.awayTeam.name), code: m.awayTeam.tla || '', flag: '' },
        kickoff: Timestamp.fromDate(new Date(m.utcDate)),
        stage: STAGE[m.stage] || 'GROUP',
        group: m.group ? String(m.group).replace('GROUP_', '') : (cur?.group ?? null),
        status,
        homeScore: hs,
        awayScore: as,
        minute: m.minute ?? null,
        lastUpdated: Timestamp.now()
      }, { merge: true })
      upserts++
    }

    // Score when finished (auto OR manually-locked-finished) and not yet scored.
    const effStatus = cur?.manualLock === true ? cur.status : status
    const effH = cur?.manualLock === true ? cur.homeScore : hs
    const effA = cur?.manualLock === true ? cur.awayScore : as
    if (effStatus === 'FINISHED' && typeof effH === 'number' && typeof effA === 'number' && cur?.scored !== true) {
      finishedToScore.push({ id, h: effH, a: effA, stage: STAGE[m.stage] || cur?.stage || 'GROUP' })
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
      await db.collection('matches').doc(String(m.id)).set({ minute: detail.minute ?? m.minute ?? null, scorers }, { merge: true })
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
    if (existing.get(id)?.autofilled === true) continue
    if (new Date(m.utcDate).getTime() > nowMs) continue // not locked yet
    const have = new Set((await db.collection('predictions').where('matchId', '==', id).get()).docs.map((d) => d.data().uid))
    const [oh, oa] = octoPredict(id)
    const fb = db.batch()
    for (const uid of allUserIds) {
      if (have.has(uid)) continue
      fb.set(db.collection('predictions').doc(`${uid}_${id}`), {
        uid, matchId: id, homeScore: oh, awayScore: oa, points: null, auto: true, submittedAt: Timestamp.now()
      })
    }
    fb.set(db.collection('matches').doc(id), { autofilled: true }, { merge: true })
    await fb.commit()
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
      tx.set(db.collection('matches').doc(fm.id), { scored: true }, { merge: true })
    })
  }
  for (const [uid, delta] of userDelta) {
    await db.collection('users').doc(uid).set({ totalPoints: FieldValue.increment(delta) }, { merge: true })
  }

  // Recompute predictionsCount per user.
  const allPreds = await db.collection('predictions').get()
  const counts = new Map()
  for (const d of allPreds.docs) {
    const uid = d.data().uid
    counts.set(uid, (counts.get(uid) || 0) + 1)
  }
  const cBatch = db.batch()
  for (const [uid, n] of counts) cBatch.set(db.collection('users').doc(uid), { predictionsCount: n }, { merge: true })
  await cBatch.commit()

  // ===== Hall of Fame & Shame =====
  const results = new Map()
  ;(await db.collection('matches').where('status', '==', 'FINISHED').get()).forEach((d) => {
    const m = d.data()
    if (typeof m.homeScore === 'number' && typeof m.awayScore === 'number') results.set(d.id, { h: m.homeScore, a: m.awayScore })
  })
  const agg = new Map()
  for (const d of allPreds.docs) {
    const p = d.data()
    const a = agg.get(p.uid) || { exact: 0, predGoals: 0, predCount: 0, draws: 0, points: 0 }
    if (p.homeScore === p.awayScore) a.draws++
    const res = results.get(p.matchId)
    if (res) {
      a.predCount++
      a.predGoals += p.homeScore + p.awayScore
      a.points += p.points || 0
      if (p.homeScore === res.h && p.awayScore === res.a) a.exact++
    }
    agg.set(p.uid, a)
  }
  const names = new Map()
  ;(await db.collection('users').get()).forEach((d) => names.set(d.id, d.data().displayName || 'משתמש'))
  const nm = (uid) => names.get(uid) || 'משתמש'
  const arr = [...agg.entries()]
  const hof = {}
  const prophet = arr.filter(([, a]) => a.exact > 0).sort((x, y) => y[1].exact - x[1].exact)[0]
  if (prophet) hof.prophet = { name: nm(prophet[0]), detail: `${prophet[1].exact} תוצאות בול` }
  const opt = arr.filter(([, a]) => a.predCount >= 3).sort((x, y) => y[1].predGoals / y[1].predCount - x[1].predGoals / x[1].predCount)[0]
  if (opt) hof.optimist = { name: nm(opt[0]), detail: `ממוצע ${(opt[1].predGoals / opt[1].predCount).toFixed(1)} שערים למשחק` }
  const drw = arr.filter(([, a]) => a.draws >= 2).sort((x, y) => y[1].draws - x[1].draws)[0]
  if (drw) hof.draw = { name: nm(drw[0]), detail: `${drw[1].draws} ניחושי תיקו` }
  const dis = arr.filter(([, a]) => a.predCount >= 3).sort((x, y) => x[1].points - y[1].points)[0]
  if (dis) hof.disaster = { name: nm(dis[0]), detail: `${dis[1].points} נק׳ מ-${dis[1].predCount} משחקים` }
  await db.collection('stats').doc('hallOfFame').set(hof)

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

  console.log(`sync ok: upserts=${upserts}, skipped(locked)=${skipped}, scored matches=${finishedToScore.length}, users updated=${userDelta.size}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
