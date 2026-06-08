import { Timestamp } from 'firebase/firestore'
import type { Match, MatchStage, MatchStatus, Prediction, UserDoc } from '../types'
import { scorePredictionForStage, mergeScoring } from './scoring'
import scheduleData from '../data/wc2026.json'

/**
 * מקור האמת ללוח המשחקים: הלוח הרשמי של מונדיאל 2026 (104 משחקים) שנמשך
 * מ-football-data.org אל src/data/wc2026.json (ע"י scripts/fetch-schedule.mjs).
 * במצב דמו זהו המקור; בפרודקשן הנתונים מגיעים מ-Firestore המסונכרן מאותו API.
 */
interface ScheduleMatch {
  id: string
  home: { name: string; code: string; flag: string }
  away: { name: string; code: string; flag: string }
  kickoff: string
  stage: MatchStage
  group: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
}

const SCHEDULE: ScheduleMatch[] = (scheduleData as { matches: ScheduleMatch[] }).matches

/** When the official schedule snapshot was fetched (ISO string), for the live-status indicator. */
export function getScheduleFetchedAt(): string | null {
  return (scheduleData as { fetchedAt?: string }).fetchedAt ?? null
}

// ===== Admin-editable match state in demo mode =====
// Overrides patch status/score onto built-in matches; custom matches are added by admin.
const MATCH_OVERRIDES_KEY = 'demo-match-overrides-v1'
const CUSTOM_MATCHES_KEY = 'demo-custom-matches-v1'

interface MatchOverride { status?: MatchStatus; homeScore?: number | null; awayScore?: number | null; manualLock?: boolean; venue?: string | null }
interface CustomMatchSpec {
  id: string
  home: { name: string; code: string; flag: string }
  away: { name: string; code: string; flag: string }
  kickoffMs: number
  stage: MatchStage
  group: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
}

function loadOverrides(): Record<string, MatchOverride> {
  try { return JSON.parse(localStorage.getItem(MATCH_OVERRIDES_KEY) || '{}') } catch { return {} }
}
function loadCustomMatches(): CustomMatchSpec[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_MATCHES_KEY) || '[]') } catch { return [] }
}

export function getDemoMatches(): Match[] {
  const ov = loadOverrides()
  const builtIn: Match[] = SCHEDULE.map((s) => {
    const o = ov[s.id] || {}
    return {
      id: s.id,
      homeTeam: s.home,
      awayTeam: s.away,
      kickoff: Timestamp.fromMillis(new Date(s.kickoff).getTime()),
      stage: s.stage,
      group: s.group,
      status: o.status ?? s.status,
      homeScore: o.homeScore !== undefined ? o.homeScore : s.homeScore,
      awayScore: o.awayScore !== undefined ? o.awayScore : s.awayScore,
      venue: o.venue ?? null,
      manualOverride: ov[s.id] != null
    }
  })
  const custom: Match[] = loadCustomMatches().map((c) => {
    const o = ov[c.id] || {}
    return {
      id: c.id,
      homeTeam: c.home,
      awayTeam: c.away,
      kickoff: Timestamp.fromMillis(c.kickoffMs),
      stage: c.stage,
      group: c.group,
      status: o.status ?? c.status,
      homeScore: o.homeScore !== undefined ? o.homeScore : c.homeScore,
      awayScore: o.awayScore !== undefined ? o.awayScore : c.awayScore,
      venue: o.venue ?? null,
      manualOverride: ov[c.id] != null
    }
  })
  return [...builtIn, ...custom].sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())
}

/** Admin (demo): patch a match's status/score. */
export function setDemoMatchResult(matchId: string, patch: MatchOverride): void {
  const ov = loadOverrides()
  ov[matchId] = { ...ov[matchId], ...patch }
  localStorage.setItem(MATCH_OVERRIDES_KEY, JSON.stringify(ov))
  window.dispatchEvent(new Event('demo-matches-changed'))
}

/** Admin (demo): patch a match's venue text. */
export function setDemoMatchVenue(matchId: string, venue: string | null): void {
  setDemoMatchResult(matchId, { venue })
}

/** Admin (demo): drop the override entirely so the match reverts to its
 * built-in schedule entry. */
export function clearDemoMatchOverride(matchId: string): void {
  const ov = loadOverrides()
  delete ov[matchId]
  localStorage.setItem(MATCH_OVERRIDES_KEY, JSON.stringify(ov))
  window.dispatchEvent(new Event('demo-matches-changed'))
}

/** Admin (demo): add a new custom match. */
export function addDemoMatch(spec: CustomMatchSpec): void {
  const list = loadCustomMatches()
  list.push(spec)
  localStorage.setItem(CUSTOM_MATCHES_KEY, JSON.stringify(list))
  window.dispatchEvent(new Event('demo-matches-changed'))
}

// משתמשי דמו ללוח הדירוג
export function getDemoLeaderboard(currentUid: string, currentDisplayName: string): UserDoc[] {
  const depts = loadDepts()
  const base: (UserDoc & { _d: string })[] = [
    { uid: 'u-ronen', displayName: 'רונן ל.', email: '', photoURL: null, totalPoints: 47, predictionsCount: 14, joinedAt: Timestamp.now(), department: null, _d: 'שיווק' },
    { uid: 'u-sharon', displayName: 'שרון ק.', email: '', photoURL: null, totalPoints: 41, predictionsCount: 14, joinedAt: Timestamp.now(), department: null, _d: 'פיתוח' },
    { uid: 'u-amit', displayName: 'עמית ב.', email: '', photoURL: null, totalPoints: 38, predictionsCount: 13, joinedAt: Timestamp.now(), department: null, _d: 'מכירות' },
    { uid: currentUid, displayName: loadProfile().displayName || currentDisplayName || 'אני', email: '', photoURL: loadProfile().photoURL ?? null, totalPoints: getCurrentUserPoints(), predictionsCount: getCurrentUserPredictionCount(), joinedAt: Timestamp.now(), department: null, _d: 'שיווק' },
    { uid: 'u-nadav', displayName: 'נדב ש.', email: '', photoURL: null, totalPoints: 22, predictionsCount: 11, joinedAt: Timestamp.now(), department: null, _d: 'פיתוח' },
    { uid: 'u-tal', displayName: 'טל ר.', email: '', photoURL: null, totalPoints: 19, predictionsCount: 10, joinedAt: Timestamp.now(), department: null, _d: 'תפעול' },
    { uid: 'u-yael', displayName: 'יעל ד.', email: '', photoURL: null, totalPoints: 15, predictionsCount: 8, joinedAt: Timestamp.now(), department: null, _d: 'מכירות' },
    { uid: 'u-eitan', displayName: 'איתן מ.', email: '', photoURL: null, totalPoints: 9,  predictionsCount: 5, joinedAt: Timestamp.now(), department: null, _d: 'תפעול' }
  ]
  return base
    .map(({ _d, ...u }) => ({ ...u, department: depts[u.uid] ?? _d }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
}

// ===== Predictions stored in localStorage in demo mode =====
const STORAGE_KEY = 'demo-predictions-v1'

interface StoredPrediction {
  matchId: string
  homeScore: number
  awayScore: number
  submittedAt: number
  points: number | null
}

function loadStored(): Record<string, StoredPrediction> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, StoredPrediction>
  } catch {
    return {}
  }
}

function saveStored(obj: Record<string, StoredPrediction>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

export function getDemoPredictions(uid: string): Record<string, Prediction> {
  const stored = loadStored()
  const matches = getDemoMatches()
  const out: Record<string, Prediction> = {}
  for (const m of matches) {
    const s = stored[m.id]
    if (!s) continue
    out[m.id] = {
      id: `${uid}_${m.id}`,
      uid,
      matchId: m.id,
      homeScore: s.homeScore,
      awayScore: s.awayScore,
      submittedAt: Timestamp.fromMillis(s.submittedAt),
      points: m.status === 'FINISHED' ? computePoints(s, m) : null
    }
  }
  return out
}

/**
 * Dev/preview helper: seed a couple of predictions on the showcase matches so the
 * fun layer (live points-in-flight + confetti on a correct finished match) is
 * visible immediately. Triggered by `?sim=1` in demo mode; never overwrites
 * predictions the user already made.
 */
export function seedDemoSimulation(): void {
  const ids = SCHEDULE.slice(0, 2).map((m) => m.id)
  if (ids.length < 2) return
  const [liveId, finishedId] = ids
  // Showcase a live game (2-1) and a finished game (3-1) on the first two fixtures.
  setDemoMatchResult(liveId, { status: 'LIVE', homeScore: 2, awayScore: 1 })
  setDemoMatchResult(finishedId, { status: 'FINISHED', homeScore: 3, awayScore: 1 })
  const stored = loadStored()
  if (!stored[liveId]) stored[liveId] = { matchId: liveId, homeScore: 2, awayScore: 1, submittedAt: Date.now(), points: null }
  if (!stored[finishedId]) stored[finishedId] = { matchId: finishedId, homeScore: 3, awayScore: 1, submittedAt: Date.now(), points: null }
  // a prediction on an upcoming (scheduled) match
  const upcomingId = SCHEDULE[2]?.id
  if (upcomingId && !stored[upcomingId]) stored[upcomingId] = { matchId: upcomingId, homeScore: 1, awayScore: 1, submittedAt: Date.now(), points: null }
  saveStored(stored)
  window.dispatchEvent(new Event('demo-predictions-changed'))
  seedDemoGoldenBoot()
}

// ===== Golden Boot goal tallies (keyed by player name) =====
const GOLDEN_BOOT_KEY = 'demo-golden-boot-v1'

export function getDemoGoldenBoot(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(GOLDEN_BOOT_KEY) || '{}') } catch { return {} }
}

function seedDemoGoldenBoot(): void {
  const goals: Record<string, number> = {
    'קיליאן מבאפה': 5, 'הארי קיין': 4, 'ויניסיוס ג׳וניור': 3,
    'לאמין יאמאל': 3, 'ליאו מסי': 2, 'לאוטרו מרטינס': 2
  }
  localStorage.setItem(GOLDEN_BOOT_KEY, JSON.stringify(goals))
  window.dispatchEvent(new Event('demo-golden-boot-changed'))
}

export function setDemoPrediction(matchId: string, homeScore: number, awayScore: number): void {
  const stored = loadStored()
  stored[matchId] = {
    matchId,
    homeScore,
    awayScore,
    submittedAt: Date.now(),
    points: null
  }
  saveStored(stored)
  // event so hooks can re-read
  window.dispatchEvent(new Event('demo-predictions-changed'))
}

function computePoints(s: StoredPrediction, m: Match): number {
  if (m.homeScore === null || m.awayScore === null) return 0
  // Reads admin-configured scoring values from localStorage if present (and
  // normalises legacy shape via mergeScoring) so the demo respects whatever
  // scoring the user has tweaked in the admin panel.
  let cfg
  try {
    const raw = localStorage.getItem('demo-app-config-v1')
    if (raw) {
      const parsed = JSON.parse(raw)
      cfg = parsed?.scoring
    }
  } catch { /* default */ }
  return scorePredictionForStage(s.homeScore, s.awayScore, m.homeScore, m.awayScore, m.stage, mergeScoring(cfg))
}

function getCurrentUserPoints(): number {
  const stored = loadStored()
  const matches = getDemoMatches()
  let sum = 0
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const s = stored[m.id]
    if (!s) continue
    sum += computePoints(s, m)
  }
  return sum
}

function getCurrentUserPredictionCount(): number {
  return Object.keys(loadStored()).length
}

// ===== Department assignment (demo) — map of uid → department =====
const DEPT_KEY = 'demo-departments-v1'
function loadDepts(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(DEPT_KEY) || '{}') } catch { return {} }
}
export function getDemoDepartment(uid: string): string | null {
  return loadDepts()[uid] ?? null
}
export function setDemoDepartment(uid: string, department: string): void {
  const m = loadDepts(); m[uid] = department
  localStorage.setItem(DEPT_KEY, JSON.stringify(m))
  window.dispatchEvent(new Event('demo-department-changed'))
}

// ===== Profile overrides (demo) — display name + photo set on the profile page =====
const PROFILE_KEY = 'demo-profile-v1'
function loadProfile(): { displayName?: string; photoURL?: string } {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') } catch { return {} }
}
export function setDemoProfile(patch: { displayName?: string; photoURL?: string }): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...loadProfile(), ...patch }))
  window.dispatchEvent(new Event('demo-predictions-changed'))
}

export function getDemoUser(uid: string, displayName: string): UserDoc {
  const p = loadProfile()
  return {
    uid,
    displayName: p.displayName || displayName || 'משתמש דמו',
    email: '',
    photoURL: p.photoURL ?? null,
    department: getDemoDepartment(uid),
    totalPoints: getCurrentUserPoints(),
    predictionsCount: getCurrentUserPredictionCount(),
    joinedAt: Timestamp.now()
  }
}

// ===== Bonus predictions (championship + top scorer) =====
const BONUS_KEY = 'demo-bonus-v1'

interface StoredBonus {
  championTeamCode: string | null
  topScorer: string | null
  runnerUpCode?: string | null
  surpriseTeamCode?: string | null
  flopTeamCode?: string | null
  updatedAt: number
}

function emptyBonus(uid: string) {
  return { uid, championTeamCode: null, topScorer: null, runnerUpCode: null, surpriseTeamCode: null, flopTeamCode: null, championPoints: null, topScorerPoints: null, updatedAt: Timestamp.now() }
}

export function getDemoBonus(uid: string) {
  try {
    const raw = localStorage.getItem(BONUS_KEY)
    if (!raw) return emptyBonus(uid)
    const s = JSON.parse(raw) as StoredBonus
    return {
      uid,
      championTeamCode: s.championTeamCode,
      topScorer: s.topScorer,
      runnerUpCode: s.runnerUpCode ?? null,
      surpriseTeamCode: s.surpriseTeamCode ?? null,
      flopTeamCode: s.flopTeamCode ?? null,
      championPoints: null,
      topScorerPoints: null,
      updatedAt: Timestamp.fromMillis(s.updatedAt)
    }
  } catch {
    return emptyBonus(uid)
  }
}

export function setDemoBonus(
  championTeamCode: string | null,
  topScorer: string | null,
  runnerUpCode: string | null = null,
  surpriseTeamCode: string | null = null,
  flopTeamCode: string | null = null
): void {
  const stored: StoredBonus = { championTeamCode, topScorer, runnerUpCode, surpriseTeamCode, flopTeamCode, updatedAt: Date.now() }
  localStorage.setItem(BONUS_KEY, JSON.stringify(stored))
  window.dispatchEvent(new Event('demo-bonus-changed'))
}

// Unique teams across all matches (for champion picker)
export function getDemoTeams() {
  const seen = new Map<string, { name: string; code: string; flag: string }>()
  for (const m of getDemoMatches()) {
    if (!seen.has(m.homeTeam.code)) seen.set(m.homeTeam.code, m.homeTeam)
    if (!seen.has(m.awayTeam.code)) seen.set(m.awayTeam.code, m.awayTeam)
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'))
}
