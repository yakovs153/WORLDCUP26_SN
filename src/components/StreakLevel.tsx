import type { Match, Prediction } from '../types'
import { computeStreaks, levelFor } from '../lib/funStats'

/**
 * Profile card — streak flames + a level badge derived from total points.
 */
export default function StreakLevel({
  matches,
  byMatchId,
  totalPoints
}: {
  matches: Match[]
  byMatchId: Record<string, Prediction>
  totalPoints: number
}) {
  const { current, best } = computeStreaks(matches, byMatchId)
  const lvl = levelFor(totalPoints)
  const progress =
    lvl.next !== null ? Math.min(100, Math.round(((totalPoints - lvl.floor) / (lvl.next - lvl.floor)) * 100)) : 100

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {/* Level badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 46, height: 46, borderRadius: 'var(--radius-md)',
              display: 'grid', placeItems: 'center', fontSize: 24,
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))',
              boxShadow: '0 6px 16px rgba(225,29,72,0.35)'
            }}
          >
            {lvl.emoji}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>רמה {lvl.level}</div>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: 0.5 }}>{lvl.title}</div>
          </div>
        </div>

        {/* Streak */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, lineHeight: 1 }} title={`רצף נוכחי: ${current} · שיא: ${best}`}>
            {current > 0 ? '🔥'.repeat(Math.min(current, 5)) : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 4 }}>
            רצף {current} · שיא {best}
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      {lvl.next !== null ? (
        <div>
          <div style={{ height: 8, borderRadius: 'var(--radius-full)', background: 'var(--glass-bg-hi)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--color-accent), var(--color-primary))',
                transition: 'width 0.5s ease'
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, textAlign: 'center' }}>
            עוד {lvl.next - totalPoints} נק׳ לרמה הבאה
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--color-accent)', textAlign: 'center', fontWeight: 700 }}>
          הגעת לרמה המקסימלית 👑
        </div>
      )}
    </div>
  )
}
