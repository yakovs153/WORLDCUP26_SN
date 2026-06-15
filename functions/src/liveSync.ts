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
import enTeams from './data/enTeams.json'
import scorerAliases from './data/scorerAliases.json'

export const FOOTBALL_TOKEN = defineSecret('FOOTBALL_DATA_TOKEN')
export const SYNC_SECRET = defineSecret('SYNC_SECRET')
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
// ODDS_API_KEY (the-odds-api.com) and API_FOOTBALL_KEY (api-football.com) are
// read from process.env — NOT defineSecret — so deploys never prompt/fail on
// them. Both APIs are best-effort: when the env var is unset the feature simply
// no-ops, and nothing ever affects the ESPN live sync.

// Analyst duo's own bonus picks — KEEP IN SYNC with src/lib/octopus.ts OCTOPUS_BONUS.
const ANALYST_BONUS = { championTeamCode: 'ESP', runnerUpCode: 'ARG', surpriseTeamCode: 'NOR', flopTeamCode: 'BRA', topScorer: 'ארלינג הולאנד' }

const EN_TEAMS = enTeams as Record<string, string>           // normalized english name -> TLA
const SCORER_ALIASES = scorerAliases as Record<string, string[]> // hebrew candidate -> latin aliases

// Normalize a name for matching: lowercase, strip diacritics + punctuation, collapse spaces.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g')
function norm(s: string | undefined | null): string {
  return String(s || '')
    .normalize('NFD').replace(COMBINING_MARKS, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
// CUR -> CUW so odds/match pairs key consistently with the client.
const tlaAlias = (c: string) => { const u = (c || '').toUpperCase(); return u === 'CUR' ? 'CUW' : u }
const pairKey = (a: string, b: string) => [tlaAlias(a), tlaAlias(b)].sort().join('_')
// English team name (as returned by odds APIs) -> our TLA, via the alias table.
function tlaFromEnglish(name: string): string | null {
  const n = norm(name)
  if (EN_TEAMS[n]) return EN_TEAMS[n]
  // Try a looser contains-match for names like "Korea Republic" vs odds variants.
  for (const k of Object.keys(EN_TEAMS)) if (n === k || n.includes(k) || k.includes(n)) return EN_TEAMS[k]
  return null
}
// Map a Latin scorer name to a Hebrew candidate name, or null if not a candidate.
function hebScorer(latinName: string): string | null {
  const n = norm(latinName)
  if (!n) return null
  for (const [heb, aliases] of Object.entries(SCORER_ALIASES)) {
    for (const a of aliases) { const an = norm(a); if (an && (n === an || n.includes(an))) return heb }
  }
  return null
}

// Minimal Gemini call for the post-match recap (mirrors dailyJob's helper).
async function geminiCall(key: string, model: string, prompt: string, maxTokens = 200): Promise<string | null> {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: 1.0 } })
    })
    if (!r.ok) { logger.warn('gemini (liveSync)', r.status); return null }
    const data = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
  } catch (e) { logger.warn('gemini error (liveSync)', e); return null }
}

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
export function tomPick(homeCode: string, awayCode: string, matchId: string, overrides?: Record<string, [number, number]>): [number, number] {
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

// Per-stage scoring (mirrors src/lib/scoring.ts on the client).
type StageScoring = { exact: number; direction: number }
type ScoringByStage = Record<string, StageScoring>

const DEFAULT_SCORING: ScoringByStage = {
  GROUP: { direction: 1, exact: 3 },
  R32:   { direction: 2, exact: 4 },
  R16:   { direction: 2, exact: 4 },
  QF:    { direction: 3, exact: 6 },
  SF:    { direction: 3, exact: 6 },
  TP:    { direction: 1, exact: 3 },
  F:     { direction: 5, exact: 10 }
}

function getStage(cfg: unknown, stage: string): StageScoring {
  const s = (cfg as Record<string, unknown> | null)?.[stage]
  if (s && typeof s === 'object' && 'exact' in s && 'direction' in s) {
    return s as StageScoring
  }
  return DEFAULT_SCORING[stage] || DEFAULT_SCORING.GROUP
}

function scorePrediction(ph: number, pa: number, ah: number, aa: number, stage: string, scoring?: ScoringByStage) {
  const s = getStage(scoring || DEFAULT_SCORING, stage)
  if (ph === ah && pa === aa) return s.exact
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  if (sign(ph - pa) !== sign(ah - aa)) return 0
  return s.direction
}

async function runSync(token: string, geminiKey?: string, oddsKey?: string, apiFootballKey?: string) {
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
  // Detect legacy scoring shape ({exact, winnerAndDiff, winnerOnly}) and fall back
  // to per-stage defaults until admin re-saves.
  const rawScoring = cfg.scoring as unknown
  const isLegacy = rawScoring && typeof rawScoring === 'object' && ('winnerAndDiff' in (rawScoring as Record<string, unknown>) || 'winnerOnly' in (rawScoring as Record<string, unknown>))
  const scoringCfg: ScoringByStage = isLegacy ? DEFAULT_SCORING : (rawScoring as ScoringByStage) || DEFAULT_SCORING
  const analystOverrides = (cfg.analystOverrides || {}) as Record<string, [number, number]>
  const analystAutofill = cfg.features?.analystAutofill !== false

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
  // Last-known live minute per match — so a momentary non-numeric ESPN clock
  // (e.g. "HT") doesn't blank the minute out during a live match.
  const existingMinuteById = new Map<string, number | null>()
  for (const d of existingMatches.docs) {
    const data = d.data()
    existingMinuteById.set(d.id, typeof data.minute === 'number' ? data.minute : null)
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

  // ===== ESPN live overlay =====
  // football-data's FREE tier lags badly on in-play status/score/minute, so we
  // overlay ESPN's free scoreboard (no key) for anything it reports as live or
  // finished. ESPN abbreviations match our TLAs (CUR↔CUW aliased). Keyed by the
  // sorted team-code pair. Only used when there's no manual override.
  type EspnLive = { state: 'pre' | 'in' | 'post'; bySideCode: Record<string, number | null>; minute: number | null }
  const espnByPair = new Map<string, EspnLive>()
  const espnCodeAlias: Record<string, string> = { CUR: 'CUW' }
  const espnNorm = (c: string | undefined | null) => { const u = (c || '').toUpperCase(); return espnCodeAlias[u] || u }
  try {
    const nowMsE = Date.now(), DAYM = 86_400_000
    const ymdE = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replace(/-/g, '')
    const datesE = [...new Set([-1, 0, 1].map((off) => ymdE(nowMsE + off * DAYM)))]
    for (const date of datesE) {
      const er = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}`)
      if (!er.ok) continue
      const edata = await er.json() as { events?: Array<{ competitions?: Array<{ competitors?: Array<{ homeAway?: string; score?: string; team?: { abbreviation?: string } }>; status?: { type?: { state?: string }; displayClock?: string } }> }> }
      for (const ev of edata.events || []) {
        const comp = ev.competitions?.[0]
        const cs = comp?.competitors || []
        if (cs.length !== 2) continue
        const a = espnNorm(cs[0].team?.abbreviation), b = espnNorm(cs[1].team?.abbreviation)
        if (!a || !b) continue
        const state = (comp?.status?.type?.state as 'pre' | 'in' | 'post') || 'pre'
        // Parse the LEADING integer only. ESPN's stoppage clock is "45+4'" —
        // stripping all non-digits would wrongly produce "454", so parseInt
        // (which stops at the '+') gives the base minute 45. "HT"/non-numeric → NaN → null.
        const min = parseInt(String(comp?.status?.displayClock || ''), 10)
        espnByPair.set([a, b].sort().join('_'), {
          state,
          bySideCode: { [a]: cs[0].score != null ? Number(cs[0].score) : null, [b]: cs[1].score != null ? Number(cs[1].score) : null },
          minute: Number.isFinite(min) ? min : null
        })
      }
    }
  } catch (e) { logger.warn('ESPN overlay fetch failed', e) }

  // ===== Odds overlay (best-effort — separate doc, never touches match state) =====
  // The Odds API (free 500/mo). Refresh only when stale (>90 min) to stay within
  // quota — one call returns all WC fixtures. Writes ONLY snapshot/odds.
  if (oddsKey) {
    try {
      const oddsDoc = await db.collection('snapshot').doc('odds').get()
      const lastMs = (oddsDoc.exists ? (oddsDoc.data() as { updatedAt?: { toMillis?: () => number } }).updatedAt?.toMillis?.() : 0) || 0
      if (Date.now() - lastMs > 90 * 60_000) {
        const or = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${oddsKey}&regions=eu,uk&markets=h2h&oddsFormat=decimal`)
        if (or.ok) {
          const events = await or.json() as Array<{ home_team?: string; away_team?: string; bookmakers?: Array<{ markets?: Array<{ key?: string; outcomes?: Array<{ name?: string; price?: number }> }> }> }>
          const items: Record<string, { home: number; draw: number; away: number; source: string }> = {}
          for (const ev of events || []) {
            const hT = tlaFromEnglish(ev.home_team || ''), aT = tlaFromEnglish(ev.away_team || '')
            if (!hT || !aT || hT === aT) continue
            // Average implied probabilities across bookmakers, then de-vig (normalize to 100%).
            let sh = 0, sd = 0, sa = 0, n = 0
            for (const bk of ev.bookmakers || []) {
              const mkt = (bk.markets || []).find((m) => m.key === 'h2h')
              if (!mkt) continue
              const priceOf = (nm: string) => mkt.outcomes?.find((o) => norm(o.name) === norm(nm))?.price
              const ph = priceOf(ev.home_team || ''), pa = priceOf(ev.away_team || ''), pd = mkt.outcomes?.find((o) => norm(o.name) === 'draw')?.price
              if (!ph || !pa || !pd) continue
              const ih = 1 / ph, id = 1 / pd, ia = 1 / pa, tot = ih + id + ia
              sh += ih / tot; sd += id / tot; sa += ia / tot; n++
            }
            if (!n) continue
            items[pairKey(hT, aT)] = {
              home: Math.round((sh / n) * 100), draw: Math.round((sd / n) * 100), away: Math.round((sa / n) * 100), source: 'market'
            }
          }
          if (Object.keys(items).length) {
            await db.collection('snapshot').doc('odds').set({ items, updatedAt: Timestamp.now() })
          }
        } else { logger.warn('odds api status', or.status) }
      }
    } catch (e) { logger.warn('odds fetch failed', e) }
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
    let status = ov ? ov.status : statusOf(m.status)
    let hs = ov ? ov.homeScore : (m.score?.fullTime?.home ?? null)
    let as = ov ? ov.awayScore : (m.score?.fullTime?.away ?? null)
    const pH = m.score?.penalties?.home ?? null
    const pA = m.score?.penalties?.away ?? null
    let winner = ov ? ov.winner : (m.score?.winner ?? null)
    let minute = ov ? ov.minute : (m.minute ?? null)

    // ESPN live overlay (only when no manual override): if ESPN reports this
    // match in-play or finished, trust ESPN for status/score/minute — it's far
    // more timely than football-data's free tier.
    if (!ov) {
      const hc = espnNorm(m.homeTeam.tla), ac = espnNorm(m.awayTeam.tla)
      const e = (hc && ac) ? espnByPair.get([hc, ac].sort().join('_')) : undefined
      if (e && (e.state === 'in' || e.state === 'post')) {
        status = e.state === 'in' ? 'LIVE' : 'FINISHED'
        const eh = e.bySideCode[hc], ea = e.bySideCode[ac]
        if (eh != null) hs = eh
        if (ea != null) as = ea
        // Keep the last known minute if ESPN's live clock is momentarily
        // non-numeric (halftime etc.), so it doesn't flicker to blank.
        minute = e.state === 'in' ? (e.minute ?? existingMinuteById.get(id) ?? null) : null
        if (e.state === 'post' && hs != null && as != null) {
          winner = hs > as ? 'HOME_TEAM' : hs < as ? 'AWAY_TEAM' : 'DRAW'
        }
      }
    }
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
      // football-data's free-tier detail.minute is frequently null and would
      // CLOBBER the timely ESPN minute set above. Only update minute when it's an
      // actual number; otherwise leave the ESPN-derived minute untouched.
      const detailMinute = typeof detail.minute === 'number' ? detail.minute : null
      const update: Record<string, unknown> = { scorers }
      if (detailMinute != null) update.minute = detailMinute
      await db.collection('matches').doc(String(m.id)).set(update, { merge: true })
      const item = snap.get(String(m.id))
      if (item) { if (detailMinute != null) item.minute = detailMinute; item.scorers = scorers }
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
  const exactByMatch = new Map<string, number>() // # of manual exact-score predictions per finished match (for the recap)
  for (const fm of finishedToScore) {
    const preds = await db.collection('predictions').where('matchId', '==', fm.id).get()
    let exact = 0
    for (const d of preds.docs) {
      const p = d.data()
      if (!p.auto && p.homeScore === fm.h && p.awayScore === fm.a) exact++
    }
    exactByMatch.set(fm.id, exact)
    await db.runTransaction(async (tx) => {
      for (const d of preds.docs) {
        const p = d.data()
        if (p.points !== null && p.points !== undefined) continue
        let pts = scorePrediction(p.homeScore, p.awayScore, fm.h, fm.a, fm.stage, scoringCfg)
        if (p.auto) pts = pts * 0.5 // auto-fill scores 50% — kept fractional (e.g. 1.5)
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

  // ===== Auto-fill missing BONUS picks (analyst's picks, scored 50% like matches) =====
  // Once bonus has locked (first kickoff), anyone who never submitted a bonus gets
  // the duo's picks, flagged auto:true so dailyJob scores them at 50%. Idempotent:
  // users who already have a bonus doc are skipped, so latecomers get filled too.
  if (earliest !== null && Date.now() >= earliest) {
    const [usersSnap, bonusSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('bonusPredictions').get()
    ])
    const haveBonus = new Set(bonusSnap.docs.map((d) => d.id))
    const bb = db.batch()
    let filled = 0
    for (const u of usersSnap.docs) {
      if (haveBonus.has(u.id) || filled >= 450) continue
      bb.set(db.collection('bonusPredictions').doc(u.id), {
        uid: u.id,
        championTeamCode: ANALYST_BONUS.championTeamCode,
        runnerUpCode: ANALYST_BONUS.runnerUpCode,
        surpriseTeamCode: ANALYST_BONUS.surpriseTeamCode,
        flopTeamCode: ANALYST_BONUS.flopTeamCode,
        topScorer: ANALYST_BONUS.topScorer,
        championPoints: null, topScorerPoints: null, awardedPoints: 0,
        auto: true, updatedAt: Timestamp.now()
      })
      filled++
    }
    if (filled) await bb.commit()
  }

  // King of the hill
  const topSnap = await db.collection('users').orderBy('totalPoints', 'desc').limit(1).get()
  if (!topSnap.empty && (topSnap.docs[0].data().totalPoints || 0) > 0) {
    const top = topSnap.docs[0]
    await db.collection('appState').doc('king').set({
      uid: top.id, name: top.data().displayName || 'משתמש', totalPoints: top.data().totalPoints || 0, gender: top.data().gender || null, updatedAt: Timestamp.now()
    })
  }

  // ===== Golden Boot auto-track (best-effort — api-football) =====
  // Fire only when a match just finished (a few times/day → well under the ~100/day
  // free quota). Writes stats/goldenBoot (race display) and auto-resolves the
  // top-scorer bonus to the live leader unless an admin locked it. ESPN state untouched.
  if (apiFootballKey && finishedToScore.length) {
    try {
      const league = process.env.API_FOOTBALL_LEAGUE || '1'   // FIFA World Cup
      const season = process.env.API_FOOTBALL_SEASON || '2026'
      const sr = await fetch(`https://v3.football.api-sports.io/players/topscorers?league=${league}&season=${season}`, {
        headers: { 'x-apisports-key': apiFootballKey }
      })
      if (sr.ok) {
        const sdata = await sr.json() as { response?: Array<{ player?: { name?: string; firstname?: string; lastname?: string }; statistics?: Array<{ goals?: { total?: number | null } }> }> }
        const rows = sdata.response || []
        const goalsOf = (r: { statistics?: Array<{ goals?: { total?: number | null } }> }) =>
          Math.max(0, ...(r.statistics || []).map((s) => s.goals?.total || 0))
        const nameOf = (r: { player?: { name?: string; firstname?: string; lastname?: string } }) =>
          [r.player?.firstname, r.player?.lastname].filter(Boolean).join(' ') || r.player?.name || ''
        // Goals per Hebrew candidate (for the race display).
        const goals: Record<string, number> = {}
        let topGoals = 0
        for (const r of rows) {
          const g = goalsOf(r)
          if (g > topGoals) topGoals = g
          if (g <= 0) continue
          const heb = hebScorer(nameOf(r))
          if (heb) goals[heb] = Math.max(goals[heb] || 0, g)
        }
        if (rows.length) {
          // Race display updates live all tournament long (visual only, no points).
          await db.collection('stats').doc('goldenBoot').set({ goals, updatedAt: Timestamp.now() }, { merge: true })
        }
        // Top-scorer BONUS points are only awarded at the END of the tournament:
        // we write bonusResults.topScorers (which the leaderboard scores) ONLY once
        // the Final has finished — never mid-tournament. Admin lock still respected.
        const finalDone = [...snap.values()].some((it) => {
          const x = it as { stage?: string; status?: string }
          return x.stage === 'F' && x.status === 'FINISHED'
        })
        const bonusResults = (cfg.bonusResults || {}) as { topScorers?: string[]; topScorerLocked?: boolean }
        if (finalDone && !bonusResults.topScorerLocked && topGoals > 0) {
          const heLeaders = [...new Set(
            rows.filter((r) => goalsOf(r) === topGoals).map((r) => hebScorer(nameOf(r))).filter((x): x is string => !!x)
          )]
          // If the real leader isn't a listed candidate, the "אחר" (Other) pick wins.
          const resolved = heLeaders.length ? heLeaders : ['אחר']
          const prev = bonusResults.topScorers || []
          const changed = resolved.length !== prev.length || resolved.some((x) => !prev.includes(x))
          if (changed) {
            await db.collection('appConfig').doc('main').set({ bonusResults: { topScorers: resolved } }, { merge: true })
          }
        }
      } else { logger.warn('api-football status', sr.status) }
    } catch (e) { logger.warn('golden boot fetch failed', e) }
  }

  // ===== Post-match recap — keep the home pundit card fresh after every game =====
  // When a match finished this run, the duo react to it (overwrites the morning
  // briefing with the latest result). Best-effort: fires once per match (the next
  // run won't see it in finishedToScore since it's already scored).
  if (geminiKey && finishedToScore.length) {
    const fm = finishedToScore[finishedToScore.length - 1] // most recent finish
    const item = snap.get(fm.id) as { homeTeam?: { name?: string; code?: string }; awayTeam?: { name?: string; code?: string } } | undefined
    if (item?.homeTeam && item?.awayTeam) {
      const hn = item.homeTeam.name || '', an = item.awayTeam.name || ''
      const [oh, oa] = tomPick(item.homeTeam.code || '', item.awayTeam.code || '', fm.id, analystOverrides)
      const exact = exactByMatch.get(fm.id) || 0
      const leaderName = topSnap.empty ? '' : (topSnap.docs[0].data().displayName || '')
      const ctx = `המשחק שהרגע נגמר: ${hn} ${fm.h}-${fm.a} ${an}. ` +
        `מספר המשתתפים שניחשו את התוצאה המדויקת: ${exact}. הניחוש שלכם (עמוס ואביגדור) היה: ${oh}-${oa}. ` +
        `המוביל בטבלה כעת: ${leaderName || 'טרם נקבע'}.`
      const recap = await geminiCall(
        geminiKey,
        process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
        `אתה "עמוס ואביגדור", צמד אנליסטים כדורגל מבוסס-AI של StoreNext — חד, שנון, מדבר בלשון רבים. ` +
        `המשחק הרגע נגמר. כתוב "מבזק אחרי המשחק" בעברית, 2 שורות קצרות, כל שורה מתחילה באימוג'י: ` +
        `שורה על התוצאה והניחוש שלכם מולה, ושורה על מי שצדק / מצב הטבלה. טון חיובי וקליל, בלי לעלוב. ` +
        `שלבו אחד מהביטויים שלכם (באור שאני רואה / זה באנקר! / נביא את הבוחטיות / תביא את הג'ובות / את הילד שלי אני שם על זה), ` +
        `ומדי פעם (לא תמיד) "טיפ" קומי קצר מ"בן אחותי" או "בן גיסי" — לעולם אל תכתוב "בן דוד". גוון בכל פעם. בלי האשטגים/מרכאות, עד 280 תווים.\n${ctx}`,
        220
      )
      if (recap) await db.collection('appState').doc('pundit').set({ text: recap, updatedAt: Timestamp.now() }, { merge: true })
    }
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
  { secrets: [FOOTBALL_TOKEN, SYNC_SECRET, GEMINI_API_KEY], region: 'europe-west1', timeoutSeconds: 120 },
  async (req, res) => {
    const provided = String(req.header('X-Sync-Secret') || '')
    if (!provided || provided !== SYNC_SECRET.value()) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    try {
      // Gemini is an optional secret; odds/api-football are optional env vars.
      // Read defensively so a missing key never 500s the sync.
      let geminiKey: string | undefined
      try { geminiKey = GEMINI_API_KEY.value() || undefined } catch { geminiKey = undefined }
      const result = await runSync(FOOTBALL_TOKEN.value(), geminiKey, process.env.ODDS_API_KEY || undefined, process.env.API_FOOTBALL_KEY || undefined)
      logger.info('liveSync', result)
      res.status(200).json({ ok: true, ...result })
    } catch (e) {
      logger.error('liveSync failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }
)
