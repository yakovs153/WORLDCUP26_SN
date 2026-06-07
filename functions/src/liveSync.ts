/**
 * Live WC sync — invoked by Cloud Scheduler every minute via HTTPS.
 *
 * Runs as the project default service account (no user refresh token in the
 * runtime auth chain). Mirrors scripts/sync-live.mjs.
 *
 * Endpoint protected by a shared secret in the X-Sync-Secret header.
 */
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import { Timestamp, getFirestore, FieldValue } from 'firebase-admin/firestore'
import heTeams from './data/heTeams.json'
import heVenues from './data/heVenues.json'
import teamStrength from './data/teamStrength.json'

export const FOOTBALL_TOKEN = defineSecret('FOOTBALL_DATA_TOKEN')
export const SYNC_SECRET = defineSecret('SYNC_SECRET')

const STRENGTH = teamStrength as Record<string, number>
const HE_TEAMS = heTeams as Record<string, string>
const HE_VENUES = heVenues as Record<string, string>

function heName(tla: string | null | undefined, fallback?: string) {
  return (tla && HE_TEAMS[tla.toUpperCase()]) || fallback || ''
}
function heVenue(en: string | null | undefined): string | null {
  return (en && HE_VENUES[en]) || en || null
}

const STAGE: Record<string, string> = {
  GROUP_STAGE: 'GROUP', LEAGUE_STAGE: 'GROUP',
  LAST_32: 'R32', LAST_16: 'R16', QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF', THIRD_PLACE: 'TP', FINAL: 'F'
}
const statusOf = (s: string) =>
  s === 'IN_PLAY' || s === 'PAUSED' ? 'LIVE'
  : s === 'FINISHED' ? 'FINISHED'
  : s === 'POSTPONED' || s === 'SUSPENDED' || s === 'CANCELLED' ? 'POSTPONED'
  : 'SCHEDULED'

const strengthOf = (code: string) => STRENGTH[(code || '').toUpperCase()] ?? 3
function hashCode(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0 }
  return h >>> 0
}
const HOME_BIG: Array<[number, number]> = [[2,0],[3,0],[3,1],[2,1],[4,1]]
const HOME_COMFORT: Array<[number, number]> = [[2,1],[2,0],[1,0],[3,1],[3,0]]
const HOME_SLIGHT: Array<[number, number]> = [[1,0],[2,1],[1,1],[2,0],[0,0]]
const EVEN_MATCH: Array<[number, number]> = [[1,1],[1,0],[0,0],[2,1],[0,1],[2,2],[1,2]]
const AWAY_SLIGHT: Array<[number, number]> = [[0,1],[1,2],[1,1],[0,2],[0,0]]
const AWAY_COMFORT: Array<[number, number]> = [[1,2],[0,2],[0,1],[1,3],[0,3]]
const AWAY_BIG: Array<[number, number]> = [[0,2],[0,3],[1,3],[1,2],[1,4]]
function bucket(gap: number) {
  if (gap >= 2.0) return HOME_BIG
  if (gap >= 1.0) return HOME_COMFORT
  if (gap >= 0.4) return HOME_SLIGHT
  if (gap > -0.4) return EVEN_MATCH
  if (gap > -1.0) return AWAY_SLIGHT
  if (gap > -2.0) return AWAY_COMFORT
  return AWAY_BIG
}
function tomPick(homeCode: string, awayCode: string, matchId: string, overrides?: Record<string, [number, number]>): [number, number] {
  const ov = overrides?.[matchId]
  if (Array.isArray(ov) && ov.length === 2) return ov
  const gap = strengthOf(homeCode) + 0.3 - strengthOf(awayCode)
  const pool = bucket(gap)
  const weights = pool.map((_, i) => Math.max(1, pool.length - i))
  const totalW = weights.reduce((a, b) => a + b, 0)
  const r = hashCode(`${matchId}|${homeCode}|${awayCode}`) % totalW
  let acc = 0
  for (let i = 0; i < pool.length; i++) { acc += weights[i]; if (r < acc) return pool[i] }
  return pool[0]
}

function scorePrediction(ph: number, pa: number, ah: number, aa: number, cfg?: { exact?: number; winnerAndDiff?: number; winnerOnly?: number }) {
  const C = cfg || { exact: 5, winnerAndDiff: 3, winnerOnly: 1 }
  if (ph === ah && pa === aa) return C.exact ?? 5
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  if (sign(ph - pa) !== sign(ah - aa)) return 0
  if (ph - pa === ah - aa) return C.winnerAndDiff ?? 3
  return C.winnerOnly ?? 1
}

async function runSync(token: string) {
  const db = getFirestore()
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', { headers: { 'X-Auth-Token': token } })
  if (!res.ok) throw new Error(`football-data ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { matches: Array<Record<string, unknown>> }
  const apiMatches = data.matches as Array<{
    id: number; utcDate: string; status: string; stage: string; group: string | null; minute?: number; venue?: string
    homeTeam: { tla: string; shortName?: string; name?: string }
    awayTeam: { tla: string; shortName?: string; name?: string }
    score: { fullTime: { home: number | null; away: number | null }; penalties?: { home: number | null; away: number | null }; winner: string | null }
  }>

  const cfgSnap = await db.collection('appConfig').doc('main').get()
  const cfg = cfgSnap.exists ? cfgSnap.data() || {} : {}
  const scoringCfg = cfg.scoring as { exact?: number; winnerAndDiff?: number; winnerOnly?: number } | undefined
  const stageMult = cfg.stageMultipliers as Record<string, number> | undefined
  const analystOverrides = (cfg.analystOverrides || {}) as Record<string, [number, number]>
  const analystAutofill = cfg.features?.analystAutofill !== false
  const applyStage = (base: number, stage: string) => Math.round(base * ((stage && stageMult && stageMult[stage]) || 1))

  const stateSnap = await db.collection('appState').doc('syncState').get()
  const sState = (stateSnap.exists ? stateSnap.data() : {}) || {}
  const scoredFlag: Record<string, boolean> = sState.scored || {}
  const autofilledFlag: Record<string, boolean> = sState.autofilled || {}

  // Read existing matches once so manualOverride entries can shadow the API
  // values. Admin sets manualOverride=true on a match doc to pin its score
  // and status; the API tick must not clobber it.
  const existingMatches = await db.collection('matches').get()
  type ManualOverride = { homeScore: number | null; awayScore: number | null; status: string; winner: string | null; minute: number | null }
  const manualOverrides = new Map<string, ManualOverride>()
  for (const d of existingMatches.docs) {
    const data = d.data()
    if (data.manualOverride === true) {
      manualOverrides.set(d.id, {
        homeScore: data.homeScore ?? null,
        awayScore: data.awayScore ?? null,
        status: data.status ?? 'FINISHED',
        winner: data.winner ?? null,
        minute: data.minute ?? null
      })
    }
  }

  const batch = db.batch()
  let upserts = 0
  const finishedToScore: Array<{ id: string; h: number; a: number; stage: string }> = []
  const snap = new Map<string, Record<string, unknown>>()

  for (const m of apiMatches) {
    const id = String(m.id)
    const ov = manualOverrides.get(id)
    // For overridden matches, score/status/winner/minute come from Firestore (admin),
    // NOT the API. Other metadata (teams, kickoff, stage, venue) always comes from API.
    const status = ov ? ov.status : statusOf(m.status)
    const hs = ov ? ov.homeScore : (m.score?.fullTime?.home ?? null)
    const as = ov ? ov.awayScore : (m.score?.fullTime?.away ?? null)
    const pH = m.score?.penalties?.home ?? null
    const pA = m.score?.penalties?.away ?? null
    const winner = ov ? ov.winner : (m.score?.winner ?? null)
    const minute = ov ? ov.minute : (m.minute ?? null)
    const homeTeam = { name: heName(m.homeTeam.tla, m.homeTeam.shortName || m.homeTeam.name), code: m.homeTeam.tla || '', flag: '' }
    const awayTeam = { name: heName(m.awayTeam.tla, m.awayTeam.shortName || m.awayTeam.name), code: m.awayTeam.tla || '', flag: '' }
    const group = m.group ? String(m.group).replace('GROUP_', '') : null
    const stage = STAGE[m.stage] || 'GROUP'

    const venue = heVenue(m.venue)
    // For overridden matches we don't touch score/status/winner/minute fields —
    // merge: true means omitted fields are preserved.
    const doc: Record<string, unknown> = {
      homeTeam, awayTeam,
      kickoff: Timestamp.fromDate(new Date(m.utcDate)),
      stage, group, venue,
      lastUpdated: Timestamp.now()
    }
    if (!ov) {
      doc.status = status
      doc.homeScore = hs
      doc.awayScore = as
      doc.penalties = (pH != null && pA != null) ? { home: pH, away: pA } : null
      doc.winner = winner ?? null
      doc.minute = minute
    }
    batch.set(db.collection('matches').doc(id), doc, { merge: true })
    upserts++

    snap.set(id, { id, homeTeam, awayTeam, kickoffMs: new Date(m.utcDate).getTime(), stage, group, status, homeScore: hs, awayScore: as, minute, scorers: [], venue })

    if (status === 'FINISHED' && typeof hs === 'number' && typeof as === 'number' && scoredFlag[id] !== true) {
      finishedToScore.push({ id, h: hs, a: as, stage })
    }
  }
  await batch.commit()

  // Live detail: minute + goalscorers for in-play matches.
  // Skip overridden matches — admin owns their state.
  for (const m of apiMatches) {
    if (statusOf(m.status) !== 'LIVE') continue
    if (manualOverrides.has(String(m.id))) continue
    try {
      const dres = await fetch(`https://api.football-data.org/v4/matches/${m.id}`, { headers: { 'X-Auth-Token': token } })
      if (!dres.ok) continue
      const detail = await dres.json() as { minute?: number; goals?: Array<{ scorer?: { name?: string }; team?: { id?: number }; minute?: number | null }>; homeTeam?: { id?: number; tla?: string }; awayTeam?: { id?: number; tla?: string } }
      const goals = Array.isArray(detail.goals) ? detail.goals : []
      const scorers = goals.map((g) => ({
        name: g.scorer?.name || '',
        team: g.team?.id === detail.homeTeam?.id ? (detail.homeTeam?.tla || '') : (detail.awayTeam?.tla || ''),
        minute: g.minute ?? null
      })).filter((s) => s.name)
      const minute = detail.minute ?? m.minute ?? null
      await db.collection('matches').doc(String(m.id)).set({ minute, scorers }, { merge: true })
      const item = snap.get(String(m.id))
      if (item) { item.minute = minute; item.scorers = scorers }
    } catch { /* ignore detail errors */ }
  }

  // Tom auto-fill: anyone who forgot gets Tom's pick at kickoff
  const nowMs = Date.now()
  const allUserIds = analystAutofill ? (await db.collection('users').get()).docs.map((d) => d.id) : []
  for (const m of apiMatches) {
    if (!analystAutofill) break
    const id = String(m.id)
    if (autofilledFlag[id] === true) continue
    if (new Date(m.utcDate).getTime() > nowMs) continue
    const have = new Set((await db.collection('predictions').where('matchId', '==', id).get()).docs.map((d) => d.data().uid))
    const [oh, oa] = tomPick(m.homeTeam.tla, m.awayTeam.tla, id, analystOverrides)
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

  // Score finished matches
  const userDelta = new Map<string, number>()
  for (const fm of finishedToScore) {
    const preds = await db.collection('predictions').where('matchId', '==', fm.id).get()
    await db.runTransaction(async (tx) => {
      for (const d of preds.docs) {
        const p = d.data()
        if (p.points !== null && p.points !== undefined) continue
        let pts = applyStage(scorePrediction(p.homeScore, p.awayScore, fm.h, fm.a, scoringCfg), fm.stage)
        if (p.auto) pts = Math.round(pts * 0.5)
        tx.update(d.ref, { points: pts })
        userDelta.set(p.uid, (userDelta.get(p.uid) || 0) + pts)
      }
    })
    scoredFlag[fm.id] = true
  }
  for (const [uid, delta] of userDelta) {
    await db.collection('users').doc(uid).set({ totalPoints: FieldValue.increment(delta) }, { merge: true })
  }

  // Bonus lock = first game kickoff
  let earliest: number | null = null
  for (const m of apiMatches) {
    const t = new Date(m.utcDate).getTime()
    if (earliest === null || t < earliest) earliest = t
  }
  if (earliest !== null) {
    await db.collection('appState').doc('timing').set({ bonusLockAt: Timestamp.fromMillis(earliest) }, { merge: true })
  }

  // King of the hill
  const topSnap = await db.collection('users').orderBy('totalPoints', 'desc').limit(1).get()
  if (!topSnap.empty && (topSnap.docs[0].data().totalPoints || 0) > 0) {
    const top = topSnap.docs[0]
    await db.collection('appState').doc('king').set({
      uid: top.id, name: top.data().displayName || 'משתמש', totalPoints: top.data().totalPoints || 0, updatedAt: Timestamp.now()
    })
  }

  // Public snapshot — clients read ONE doc instead of all 104 matches
  await db.collection('snapshot').doc('matches').set({
    items: [...snap.values()].sort((a, b) => (a.kickoffMs as number) - (b.kickoffMs as number)),
    updatedAt: Timestamp.now()
  })

  await db.collection('appState').doc('syncState').set({ scored: scoredFlag, autofilled: autofilledFlag, updatedAt: Timestamp.now() }, { merge: true })

  return { upserts, scored: finishedToScore.length, usersUpdated: userDelta.size }
}

export const liveSync = onRequest(
  { secrets: [FOOTBALL_TOKEN, SYNC_SECRET], region: 'europe-west1', timeoutSeconds: 120 },
  async (req, res) => {
    const provided = String(req.header('X-Sync-Secret') || '')
    if (!provided || provided !== SYNC_SECRET.value()) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    try {
      const result = await runSync(FOOTBALL_TOKEN.value())
      logger.info('liveSync', result)
      res.status(200).json({ ok: true, ...result })
    } catch (e) {
      logger.error('liveSync failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }
)
