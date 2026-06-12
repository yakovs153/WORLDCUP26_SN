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
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

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

async function runSync(token: string, geminiKey?: string) {
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

  // King of the hill
  const topSnap = await db.collection('users').orderBy('totalPoints', 'desc').limit(1).get()
  if (!topSnap.empty && (topSnap.docs[0].data().totalPoints || 0) > 0) {
    const top = topSnap.docs[0]
    await db.collection('appState').doc('king').set({
      uid: top.id, name: top.data().displayName || 'משתמש', totalPoints: top.data().totalPoints || 0, gender: top.data().gender || null, updatedAt: Timestamp.now()
    })
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
        `ומדי פעם "טיפ" קומי מבן גיסי/בן אחותי. בלי האשטגים/מרכאות, עד 280 תווים.\n${ctx}`,
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
      let geminiKey: string | undefined
      try { geminiKey = GEMINI_API_KEY.value() } catch { geminiKey = undefined }
      const result = await runSync(FOOTBALL_TOKEN.value(), geminiKey)
      logger.info('liveSync', result)
      res.status(200).json({ ok: true, ...result })
    } catch (e) {
      logger.error('liveSync failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }
)
