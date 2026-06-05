import { scorePrediction, applyStage } from './scoring'
import type { Match, ScoringConfig, StageMultipliers, LeaderboardEntry } from '../types'

export const OCTOPUS_UID = 'octopus'        // internal id (kept stable)
export const OCTOPUS_NAME = 'טום האנליסט'    // display name — the AI analyst
export const AUTO_FACTOR = 0.7              // forgot to predict? Tom's pick scores 70%

/**
 * Tom the Analyst's pick for a match — deterministic from the match id, so it's
 * the same for everyone and reproducible. Plausible: 0–3 per side, total ≤ 5.
 */
export function octoPredict(matchId: string): [number, number] {
  let h = 0
  for (let i = 0; i < matchId.length; i++) h = (h * 31 + matchId.charCodeAt(i)) >>> 0
  let home = h % 4
  let away = Math.floor(h / 4) % 4
  while (home + away > 5) { if (home >= away) home--; else away-- }
  return [home, away]
}

/** Synthetic leaderboard entry for the Octopus, scored from its picks vs finished results. */
export function octopusEntry(matches: Match[], scoring: ScoringConfig, stageMult?: StageMultipliers): LeaderboardEntry {
  let total = 0
  let count = 0
  for (const m of matches) {
    // Finished = final points; live = provisional (so the board moves during a match).
    if ((m.status === 'FINISHED' || m.status === 'LIVE') && m.homeScore != null && m.awayScore != null) {
      const [h, a] = octoPredict(m.id)
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
