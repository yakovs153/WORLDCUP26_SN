/**
 * לוגיקת ניקוד טהורה (זהה ל-src/lib/scoring.ts ב-client, משוכפלת
 * כי functions ו-client לא חולקים קוד דרך bundler זהה).
 */
export interface ScoringConfig {
  exact: number
  winnerAndDiff: number
  winnerOnly: number
}

const DEFAULT_SCORING: ScoringConfig = { exact: 5, winnerAndDiff: 3, winnerOnly: 1 }

export function scorePrediction(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  cfg: ScoringConfig = DEFAULT_SCORING
): number {
  if (predHome === actualHome && predAway === actualAway) return cfg.exact

  const predDiff = predHome - predAway
  const actualDiff = actualHome - actualAway
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  const sameOutcome = sign(predDiff) === sign(actualDiff)

  if (!sameOutcome) return 0
  if (predDiff === actualDiff) return cfg.winnerAndDiff
  return cfg.winnerOnly
}
