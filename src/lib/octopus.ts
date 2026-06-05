import { scorePrediction, applyStage } from './scoring'
import strength from '../data/teamStrength.json'
import type { Match, ScoringConfig, StageMultipliers, LeaderboardEntry } from '../types'

export const OCTOPUS_UID = 'octopus'        // internal id (kept stable)
export const OCTOPUS_NAME = 'טום האנליסט'    // display name — the AI analyst
export const AUTO_FACTOR = 0.7              // forgot to predict? Tom's pick scores 70%

export type AnalystOverrides = Record<string, [number, number]>

const STRENGTH = strength as Record<string, number>
const strengthOf = (code: string) => STRENGTH[code?.toUpperCase()] ?? 3

/**
 * Tom the Analyst's pick — mirrors the bookmakers' favourite: the stronger team
 * (with home edge) wins by a typical margin. Admin can override per match.
 */
export function tomPick(homeCode: string, awayCode: string, matchId: string, overrides?: AnalystOverrides): [number, number] {
  const ov = overrides?.[matchId]
  if (ov && ov.length === 2) return ov
  const gap = strengthOf(homeCode) + 0.3 - strengthOf(awayCode) // +0.3 home advantage
  if (gap >= 1.5) return [2, 0]
  if (gap >= 0.5) return [2, 1]
  if (gap > -0.5) return [1, 1]
  if (gap > -1.5) return [1, 2]
  return [0, 2]
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

/** Synthetic leaderboard entry for Tom, scored from his picks vs finished results. */
export function octopusEntry(matches: Match[], scoring: ScoringConfig, stageMult?: StageMultipliers, overrides?: AnalystOverrides): LeaderboardEntry {
  let total = 0
  let count = 0
  for (const m of matches) {
    // Finished = final points; live = provisional (so the board moves during a match).
    if ((m.status === 'FINISHED' || m.status === 'LIVE') && m.homeScore != null && m.awayScore != null) {
      const [h, a] = tomPick(m.homeTeam.code, m.awayTeam.code, m.id, overrides)
      total += applyStage(scorePrediction(h, a, m.homeScore, m.awayScore, scoring), m.stage, stageMult)
      count++
    }
  }
  return {
    uid: OCTOPUS_UID,
    displayName: OCTOPUS_NAME,
    email: '',
    photoURL: null,
    department: '🤖 אנליסט AI',
    totalPoints: total,
    predictionsCount: count,
    joinedAt: { toDate: () => new Date() } as never,
    rank: 0
  }
}
