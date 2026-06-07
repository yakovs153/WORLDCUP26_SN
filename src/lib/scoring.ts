import type { MatchStage, ScoringConfig, StageScoring } from '../types'
import { DEFAULT_APP_CONFIG } from '../types'

/**
 * Pure scoring function. Returns either the stage's "exact" points (when the
 * predicted score matches the actual score), "direction" points (when the
 * outcome — winner or draw — is correct), or 0.
 *
 * The old "winner-and-correct-diff" middle bucket has been retired — there are
 * now exactly two non-zero outcomes per match.
 */
export function scorePrediction(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  stageScoring: StageScoring = DEFAULT_APP_CONFIG.scoring.GROUP
): number {
  if (predHome === actualHome && predAway === actualAway) return stageScoring.exact
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  if (sign(predHome - predAway) !== sign(actualHome - actualAway)) return 0
  return stageScoring.direction
}

/**
 * Read the per-stage scoring object out of a (possibly partial / stale) config.
 * If the live config still has the OLD shape ({exact, winnerAndDiff, winnerOnly}
 * + stageMultipliers) we fall back to the new defaults so the app keeps working
 * until the admin saves once from the panel.
 */
export function getStageScoring(scoring: unknown, stage: MatchStage): StageScoring {
  const obj = scoring as Record<string, unknown> | null | undefined
  const candidate = obj?.[stage]
  if (candidate && typeof candidate === 'object' && 'exact' in candidate && 'direction' in candidate) {
    return candidate as StageScoring
  }
  return DEFAULT_APP_CONFIG.scoring[stage] ?? DEFAULT_APP_CONFIG.scoring.GROUP
}

/**
 * Convenience: score a prediction given just a stage + the full ScoringConfig.
 */
export function scorePredictionForStage(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  stage: MatchStage,
  scoring: ScoringConfig
): number {
  return scorePrediction(predHome, predAway, actualHome, actualAway, getStageScoring(scoring, stage))
}

/**
 * @deprecated `applyStage` is a no-op now — multipliers were absorbed into the
 * per-stage scoring object. Returns the value unchanged. Remove once nothing
 * calls it.
 */
export function applyStage(base: number, _stage?: MatchStage, _mult?: unknown): number {
  return Math.round(base)
}

const STAGES: MatchStage[] = ['GROUP', 'R32', 'R16', 'QF', 'SF', 'TP', 'F']

/**
 * Merge a (possibly stale or old-shape) saved scoring object with defaults.
 * If saved data is the legacy {exact, winnerAndDiff, winnerOnly} shape, we
 * discard it and use defaults (so old configs don't pollute the new structure).
 */
export function mergeScoring(saved: unknown): ScoringConfig {
  if (!saved || typeof saved !== 'object') return DEFAULT_APP_CONFIG.scoring
  const s = saved as Record<string, unknown>
  // Old shape detector
  if ('winnerAndDiff' in s || 'winnerOnly' in s) return DEFAULT_APP_CONFIG.scoring
  const out = {} as ScoringConfig
  for (const k of STAGES) {
    const stageDefaults = DEFAULT_APP_CONFIG.scoring[k]
    const stageSaved = s[k] as Partial<StageScoring> | undefined
    out[k] = {
      exact: typeof stageSaved?.exact === 'number' ? stageSaved.exact : stageDefaults.exact,
      direction: typeof stageSaved?.direction === 'number' ? stageSaved.direction : stageDefaults.direction
    }
  }
  return out
}
