import { Timestamp } from 'firebase/firestore'
import type { Match, MatchStage, MatchStatus, Prediction, UserDoc } from '../types'
import { scorePrediction } from './scoring'

/**
 * נתוני דמו עבור VITE_DEMO_MODE=true.
 * משחקים פיקטיביים עם תאריכים יחסיים ל-now כדי שהמסך תמיד "חי".
 */

const T = {
  bra: { name: 'ברזיל', code: 'BRA', flag: '🇧🇷' },
  arg: { name: 'ארגנטינה', code: 'ARG', flag: '🇦🇷' },
  fra: { name: 'צרפת', code: 'FRA', flag: '🇫🇷' },
  eng: { name: 'אנגליה', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  esp: { name: 'ספרד', code: 'ESP', flag: '🇪🇸' },
  por: { name: 'פורטוגל', code: 'POR', flag: '🇵🇹' },
  ger: { name: 'גרמניה', code: 'GER', flag: '🇩🇪' },
  ned: { name: 'הולנד', code: 'NED', flag: '🇳🇱' },
  bel: { name: 'בלגיה', code: 'BEL', flag: '🇧🇪' },
  cro: { name: 'קרואטיה', code: 'CRO', flag: '🇭🇷' },
  ita: { name: 'איטליה', code: 'ITA', flag: '🇮🇹' },
  usa: { name: 'ארה"ב', code: 'USA', flag: '🇺🇸' },
  mex: { name: 'מקסיקו', code: 'MEX', flag: '🇲🇽' },
  can: { name: 'קנדה', code: 'CAN', flag: '🇨🇦' },
  mar: { name: 'מרוקו', code: 'MAR', flag: '🇲🇦' },
  jpn: { name: 'יפן', code: 'JPN', flag: '🇯🇵' },
  sen: { name: 'סנגל', code: 'SEN', flag: '🇸🇳' },
  uru: { name: 'אורוגוואי', code: 'URY', flag: '🇺🇾' }
}

interface DemoSpec {
  id: string
  home: keyof typeof T
  away: keyof typeof T
  stage: MatchStage
  group: string | null
  // Absolute date in WC 2026 schedule
  month: number  // 6 = June, 7 = July
  day: number
  hour: number   // local time (Israel)
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
}

/**
 * לוח משחקי מונדיאל 2026 — תאריכים מ-11/6/2026 עד 19/7/2026.
 * זו רשימה דמו ייצוגית. תוכל לערוך/להחליף דרך פאנל הניהול (בעתיד) או דרך seed-matches.mjs.
 */
const YEAR = 2026

const SPECS: DemoSpec[] = [
  // === GROUP STAGE — Matchday 1 (June 11-16) ===
  { id: 'm01', home: 'mex', away: 'bra', stage: 'GROUP', group: 'A', month: 6, day: 11, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm02', home: 'usa', away: 'fra', stage: 'GROUP', group: 'B', month: 6, day: 12, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm03', home: 'can', away: 'arg', stage: 'GROUP', group: 'C', month: 6, day: 13, hour: 20, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm04', home: 'eng', away: 'sen', stage: 'GROUP', group: 'D', month: 6, day: 13, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm05', home: 'esp', away: 'jpn', stage: 'GROUP', group: 'E', month: 6, day: 14, hour: 20, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm06', home: 'ger', away: 'cro', stage: 'GROUP', group: 'F', month: 6, day: 14, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm07', home: 'por', away: 'mar', stage: 'GROUP', group: 'G', month: 6, day: 15, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm08', home: 'ned', away: 'ita', stage: 'GROUP', group: 'H', month: 6, day: 16, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },

  // === GROUP STAGE — Matchday 2 (June 17-21) ===
  { id: 'm09', home: 'bra', away: 'bel', stage: 'GROUP', group: 'A', month: 6, day: 17, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm10', home: 'fra', away: 'uru', stage: 'GROUP', group: 'B', month: 6, day: 18, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm11', home: 'arg', away: 'mex', stage: 'GROUP', group: 'C', month: 6, day: 19, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm12', home: 'esp', away: 'eng', stage: 'GROUP', group: 'D', month: 6, day: 20, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },

  // === GROUP STAGE — Matchday 3 (June 22-27) ===
  { id: 'm13', home: 'por', away: 'ned', stage: 'GROUP', group: 'G', month: 6, day: 24, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm14', home: 'mar', away: 'usa', stage: 'GROUP', group: 'G', month: 6, day: 25, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },

  // === KNOCKOUT ===
  { id: 'm15', home: 'bra', away: 'jpn', stage: 'R16', group: null, month: 6, day: 29, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm16', home: 'fra', away: 'sen', stage: 'R16', group: null, month: 6, day: 30, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm17', home: 'arg', away: 'esp', stage: 'QF',  group: null, month: 7, day: 5,  hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm18', home: 'eng', away: 'ger', stage: 'SF',  group: null, month: 7, day: 9,  hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null },
  { id: 'm19', home: 'bra', away: 'fra', stage: 'F',   group: null, month: 7, day: 19, hour: 22, status: 'SCHEDULED', homeScore: null, awayScore: null }
]

function kickoffDate(month: number, day: number, hour: number): Date {
  // month is 1-12 here; JS Date wants 0-11
  return new Date(YEAR, month - 1, day, hour, 0, 0, 0)
}

export function getDemoMatches(): Match[] {
  return SPECS.map((s) => ({
    id: s.id,
    homeTeam: T[s.home],
    awayTeam: T[s.away],
    kickoff: Timestamp.fromDate(kickoffDate(s.month, s.day, s.hour)),
    stage: s.stage,
    group: s.group,
    status: s.status,
    homeScore: s.homeScore,
    awayScore: s.awayScore
  }))
}

// משתמשי דמו ללוח הדירוג
export function getDemoLeaderboard(currentUid: string, currentDisplayName: string): UserDoc[] {
  return [
    { uid: 'u-ronen', displayName: 'רונן ל.', email: '', photoURL: null, totalPoints: 47, predictionsCount: 14, joinedAt: Timestamp.now() },
    { uid: 'u-sharon', displayName: 'שרון ק.', email: '', photoURL: null, totalPoints: 41, predictionsCount: 14, joinedAt: Timestamp.now() },
    { uid: 'u-amit', displayName: 'עמית ב.', email: '', photoURL: null, totalPoints: 38, predictionsCount: 13, joinedAt: Timestamp.now() },
    { uid: currentUid, displayName: currentDisplayName || 'אני', email: '', photoURL: null, totalPoints: getCurrentUserPoints(), predictionsCount: getCurrentUserPredictionCount(), joinedAt: Timestamp.now() },
    { uid: 'u-nadav', displayName: 'נדב ש.', email: '', photoURL: null, totalPoints: 22, predictionsCount: 11, joinedAt: Timestamp.now() },
    { uid: 'u-tal', displayName: 'טל ר.', email: '', photoURL: null, totalPoints: 19, predictionsCount: 10, joinedAt: Timestamp.now() },
    { uid: 'u-yael', displayName: 'יעל ד.', email: '', photoURL: null, totalPoints: 15, predictionsCount: 8, joinedAt: Timestamp.now() },
    { uid: 'u-eitan', displayName: 'איתן מ.', email: '', photoURL: null, totalPoints: 9,  predictionsCount: 5, joinedAt: Timestamp.now() }
  ].sort((a, b) => b.totalPoints - a.totalPoints)
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
  // Reads admin-configured scoring values from localStorage if present
  let cfg
  try {
    const raw = localStorage.getItem('demo-app-config-v1')
    if (raw) {
      const parsed = JSON.parse(raw)
      cfg = parsed?.scoring
    }
  } catch { /* default */ }
  return scorePrediction(s.homeScore, s.awayScore, m.homeScore, m.awayScore, cfg)
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

export function getDemoUser(uid: string, displayName: string): UserDoc {
  return {
    uid,
    displayName: displayName || 'משתמש דמו',
    email: '',
    photoURL: null,
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
  updatedAt: number
}

export function getDemoBonus(uid: string) {
  try {
    const raw = localStorage.getItem(BONUS_KEY)
    if (!raw) return { uid, championTeamCode: null, topScorer: null, championPoints: null, topScorerPoints: null, updatedAt: Timestamp.now() }
    const s = JSON.parse(raw) as StoredBonus
    return {
      uid,
      championTeamCode: s.championTeamCode,
      topScorer: s.topScorer,
      championPoints: null,
      topScorerPoints: null,
      updatedAt: Timestamp.fromMillis(s.updatedAt)
    }
  } catch {
    return { uid, championTeamCode: null, topScorer: null, championPoints: null, topScorerPoints: null, updatedAt: Timestamp.now() }
  }
}

export function setDemoBonus(championTeamCode: string | null, topScorer: string | null): void {
  const stored: StoredBonus = {
    championTeamCode,
    topScorer,
    updatedAt: Date.now()
  }
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
