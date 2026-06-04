import type { ScoringConfig } from '../types'

const DEFAULT: ScoringConfig = { exact: 5, winnerAndDiff: 3, winnerOnly: 1 }

/**
 * Pure scoring function. Reads point values from optional config (managed by admin),
 * defaulting to 5/3/1/0 if not provided.
 */
export function scorePrediction(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  config: ScoringConfig = DEFAULT
): number {
  if (predHome === actualHome && predAway === actualAway) return config.exact

  const predDiff = predHome - predAway
  const actualDiff = actualHome - actualAway
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  const sameOutcome = sign(predDiff) === sign(actualDiff)

  if (!sameOutcome) return 0
  if (predDiff === actualDiff) return config.winnerAndDiff
  return config.winnerOnly
}
