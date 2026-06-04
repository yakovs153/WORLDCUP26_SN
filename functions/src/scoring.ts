/**
 * לוגיקת ניקוד טהורה (זהה ל-src/lib/scoring.ts ב-client, משוכפלת
 * כי functions ו-client לא חולקים קוד דרך bundler זהה).
 */
export function scorePrediction(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  if (predHome === actualHome && predAway === actualAway) return 5

  const predDiff = predHome - predAway
  const actualDiff = actualHome - actualAway
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  const sameOutcome = sign(predDiff) === sign(actualDiff)

  if (!sameOutcome) return 0
  if (predDiff === actualDiff) return 3
  return 1
}
