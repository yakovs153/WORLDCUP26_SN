import { scorePredictionForStage } from './scoring'
import strength from '../data/teamStrength.json'
import type { Match, ScoringConfig, BonusScoringConfig, LeaderboardEntry } from '../types'

/**
 * עמוס ואביגדור's own bonus picks (hardcoded — they put their bonus on the line
 * like everyone else). Scored inside octopusEntry with the same resolution rules
 * real users get, so the duo's leaderboard total grows as bonuses resolve.
 */
export const OCTOPUS_BONUS = {
  championTeamCode: 'ESP',   // 🏆 ספרד
  runnerUpCode:     'ARG',   // 🥈 ארגנטינה (מפסידת הגמר)
  surpriseTeamCode: 'NOR',   // 🐎 נורבגיה (הפתעה — מגיעה לרבע גמר)
  flopTeamCode:     'BRA',   // 📉 ברזיל (אכזבה — לא מגיעה לרבע גמר)
  topScorer:        'ארלינג הולאנד' // ⚽ מלך שערים
}

export const OCTOPUS_UID = 'octopus'        // internal id (kept stable)
export const OCTOPUS_NAME = 'עמוס ואביגדור'   // display name — the AI analysts (formerly "טום"/"רובי")
export const AUTO_FACTOR = 0.5              // forgot to predict? Tom's pick scores 50%

export type AnalystOverrides = Record<string, [number, number]>

const STRENGTH = strength as Record<string, number>
const strengthOf = (code: string) => STRENGTH[code?.toUpperCase()] ?? 3

// Deterministic hash → same match always gets the same Tom pick.
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0 }
  return h >>> 0
}

// Plausible correct-score sets per strength gap, ranked roughly by bookmaker frequency.
// (Real markets cluster like this: big favourites win 2-0/3-1; even games are 1-1 or 1-0;
// blowouts include 3-0/4-1 occasionally.) We pick deterministically by match id.
const HOME_BIG     : Array<[number, number]> = [[2, 0], [3, 0], [3, 1], [2, 1], [4, 1]]
const HOME_COMFORT : Array<[number, number]> = [[2, 1], [2, 0], [1, 0], [3, 1], [3, 0]]
const HOME_SLIGHT  : Array<[number, number]> = [[1, 0], [2, 1], [1, 1], [2, 0], [0, 0]]
const EVEN_MATCH   : Array<[number, number]> = [[1, 1], [1, 0], [0, 0], [2, 1], [0, 1], [2, 2], [1, 2]]
const AWAY_SLIGHT  : Array<[number, number]> = [[0, 1], [1, 2], [1, 1], [0, 2], [0, 0]]
const AWAY_COMFORT : Array<[number, number]> = [[1, 2], [0, 2], [0, 1], [1, 3], [0, 3]]
const AWAY_BIG     : Array<[number, number]> = [[0, 2], [0, 3], [1, 3], [1, 2], [1, 4]]

function bucket(gap: number): Array<[number, number]> {
  if (gap >= 2.0)  return HOME_BIG
  if (gap >= 1.0)  return HOME_COMFORT
  if (gap >= 0.4)  return HOME_SLIGHT
  if (gap > -0.4)  return EVEN_MATCH
  if (gap > -1.0)  return AWAY_SLIGHT
  if (gap > -2.0)  return AWAY_COMFORT
  return AWAY_BIG
}

/**
 * Tom the Analyst's pick — mirrors the bookmakers' favourite: the stronger team
 * (with home edge) wins, with VARIED but plausible margins. Admin can override.
 */
export function tomPick(homeCode: string, awayCode: string, matchId: string, overrides?: AnalystOverrides): [number, number] {
  const ov = overrides?.[matchId]
  if (ov && ov.length === 2) return ov
  const gap = strengthOf(homeCode) + 0.3 - strengthOf(awayCode) // +0.3 home edge
  const pool = bucket(gap)
  // Weight earlier entries more heavily — uneven probabilities, deterministic.
  const weights = pool.map((_, i) => Math.max(1, pool.length - i))
  const totalW = weights.reduce((a, b) => a + b, 0)
  const r = hash(`${matchId}|${homeCode}|${awayCode}`) % totalW
  let acc = 0
  for (let i = 0; i < pool.length; i++) { acc += weights[i]; if (r < acc) return pool[i] }
  return pool[0]
}

/** Rough win/draw/win probabilities from team strength (for the match-center bar). */
export function winProb(homeCode: string, awayCode: string): { home: number; draw: number; away: number } {
  const gap = strengthOf(homeCode) + 0.3 - strengthOf(awayCode)
  const homeShare = 1 / (1 + Math.exp(-gap))            // 0..1
  const draw = Math.max(0.12, 0.30 - Math.abs(gap) * 0.06)
  const h = homeShare * (1 - draw)
  const a = (1 - homeShare) * (1 - draw)
  const tot = h + draw + a || 1
  return { home: Math.round((h / tot) * 100), draw: Math.round((draw / tot) * 100), away: Math.round((a / tot) * 100) }
}

/** Synthetic leaderboard entry for the analyst duo: match picks + their own bonus. */
export function octopusEntry(
  matches: Match[],
  scoring: ScoringConfig,
  _stageMult?: unknown,
  overrides?: AnalystOverrides,
  bonus?: { values: BonusScoringConfig; topScorers?: string[] }
): LeaderboardEntry {
  let total = 0
  let count = 0
  for (const m of matches) {
    // Finished = final points; live = provisional (so the board moves during a match).
    if ((m.status === 'FINISHED' || m.status === 'LIVE') && m.homeScore != null && m.awayScore != null) {
      const [h, a] = tomPick(m.homeTeam.code, m.awayTeam.code, m.id, overrides)
      total += scorePredictionForStage(h, a, m.homeScore, m.awayScore, m.stage, scoring)
      count++
    }
  }

  // ===== Analyst bonus — same resolution rules as real users =====
  if (bonus) {
    const up = (s: string | undefined | null) => String(s || '').toUpperCase()
    const codeOf = (t: { code?: string } | undefined) => up(t?.code)
    const final = matches.find((m) => m.stage === 'F' && m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null)
    let champion: string | null = null, runnerUp: string | null = null
    if (final && final.homeScore != null && final.awayScore != null) {
      const h = codeOf(final.homeTeam), a = codeOf(final.awayTeam)
      if (final.homeScore > final.awayScore) { champion = h; runnerUp = a }
      else if (final.awayScore > final.homeScore) { champion = a; runnerUp = h }
    }
    const reachedIn = (stages: string[]) => {
      const s = new Set<string>()
      for (const m of matches) if (stages.includes(m.stage)) { const h = codeOf(m.homeTeam), a = codeOf(m.awayTeam); if (h) s.add(h); if (a) s.add(a) }
      return s
    }
    const qfReachers = reachedIn(['QF', 'SF', 'TP', 'F'])
    const qfStarted = qfReachers.size > 0
    const v = bonus.values
    if (champion && OCTOPUS_BONUS.championTeamCode === champion) total += v.champion || 0
    if (runnerUp && OCTOPUS_BONUS.runnerUpCode === runnerUp) total += v.runnerUp || 0
    if (qfReachers.has(OCTOPUS_BONUS.surpriseTeamCode)) total += v.surprise || 0
    if (qfStarted && !qfReachers.has(OCTOPUS_BONUS.flopTeamCode)) total += v.flop || 0
    if (bonus.topScorers?.includes(OCTOPUS_BONUS.topScorer)) total += v.topScorer || 0
  }

  return {
    uid: OCTOPUS_UID,
    displayName: OCTOPUS_NAME,
    email: '',
    photoURL: null,
    department: '🎲 מהמרים',
    totalPoints: total,
    predictionsCount: count,
    joinedAt: { toDate: () => new Date() } as never,
    rank: 0
  }
}
