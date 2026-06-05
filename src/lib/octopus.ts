import { scorePrediction } from './scoring'
import type { Match, ScoringConfig, LeaderboardEntry } from '../types'

export const OCTOPUS_UID = 'octopus'
export const OCTOPUS_NAME = 'סטורי התמנון'

/**
 * The Octopus's pick for a match — deterministic from the match id, so it's the
 * same for everyone and reproducible. Random but plausible: 0–3 per side,
 * total ≤ 5 (never 6-6 or 9-1).
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
export function octopusEntry(matches: Match[], scoring: ScoringConfig): LeaderboardEntry {
  let total = 0
  let count = 0
  for (const m of matches) {
    // Finished = final points; live = provisional (so the board moves during a match).
    if ((m.status === 'FINISHED' || m.status === 'LIVE') && m.homeScore != null && m.awayScore != null) {
      const [h, a] = octoPredict(m.id)
      total += scorePrediction(h, a, m.homeScore, m.awayScore, scoring)
      count++
    }
  }
  return {
    uid: OCTOPUS_UID,
    displayName: OCTOPUS_NAME,
    email: '',
    photoURL: null,
    department: null,
    totalPoints: total,
    predictionsCount: count,
    joinedAt: { toDate: () => new Date() } as never,
    rank: 0
  }
}
