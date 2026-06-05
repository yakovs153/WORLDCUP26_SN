import type { Match, Prediction } from '../types'

/**
 * Current & best streak of correct calls (points > 0), computed from finished
 * matches that the user actually predicted, ordered by kickoff.
 */
export function computeStreaks(matches: Match[], byMatchId: Record<string, Prediction>): { current: number; best: number } {
  const finished = matches
    .filter((m) => m.status === 'FINISHED' && byMatchId[m.id])
    .sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())

  let current = 0
  let best = 0
  for (const m of finished) {
    const p = byMatchId[m.id]
    const correct = (p?.points ?? 0) > 0
    if (correct) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 0
    }
  }
  return { current, best }
}

export interface Level {
  level: number
  title: string
  emoji: string
  floor: number
  next: number | null // points needed for the next level, null at max
}

const TIERS: { floor: number; title: string; emoji: string }[] = [
  { floor: 0,   title: 'מתחמם על הקווים', emoji: '🌱' },
  { floor: 25,  title: 'חלוץ מבטיח',       emoji: '⚽' },
  { floor: 50,  title: 'קשר אמן',          emoji: '🎯' },
  { floor: 100, title: 'חוד החנית',        emoji: '🔥' },
  { floor: 175, title: 'מלך המגרש',        emoji: '👑' }
]

export function levelFor(points: number): Level {
  let idx = 0
  for (let i = 0; i < TIERS.length; i++) {
    if (points >= TIERS[i].floor) idx = i
  }
  const tier = TIERS[idx]
  const nextTier = TIERS[idx + 1] ?? null
  return {
    level: idx + 1,
    title: tier.title,
    emoji: tier.emoji,
    floor: tier.floor,
    next: nextTier ? nextTier.floor : null
  }
}
