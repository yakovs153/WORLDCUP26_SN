import type { Match, Prediction } from '../types'

interface Props {
  matches: Match[]
  byMatchId: Record<string, Prediction>
}

interface Bucket {
  key: 'exact' | 'direction' | 'wrong'
  label: string
  count: number
  color: string
  emoji: string
}

/**
 * Per-user prediction outcome breakdown. Categorises every finished match
 * the user predicted into one of three buckets — exact score, correct
 * direction (winner OR draw), or wrong. Counts only the outcome shape;
 * point values are stage-dependent and tracked elsewhere.
 */
export default function StatsBreakdown({ matches, byMatchId }: Props) {
  const buckets: Bucket[] = [
    { key: 'exact',     label: 'מדויק', count: 0, color: 'var(--color-primary)',                                          emoji: '🎯' },
    { key: 'direction', label: 'כיוון', count: 0, color: 'color-mix(in srgb, var(--color-primary) 55%, var(--color-bg))', emoji: '✅' },
    { key: 'wrong',     label: 'שגוי',  count: 0, color: 'var(--color-border-strong)',                                    emoji: '❌' }
  ]

  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)

  for (const m of matches) {
    if (m.status !== 'FINISHED' || m.homeScore === null || m.awayScore === null) continue
    const p = byMatchId[m.id]
    if (!p) continue
    if (p.homeScore === m.homeScore && p.awayScore === m.awayScore) {
      buckets[0].count++
    } else if (sign(p.homeScore - p.awayScore) === sign(m.homeScore - m.awayScore)) {
      buckets[1].count++
    } else {
      buckets[2].count++
    }
  }

  const total = buckets.reduce((s, b) => s + b.count, 0)

  if (total === 0) {
    return (
      <div
        className="card"
        style={{
          padding: 'var(--space-4)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 13
        }}
      >
        טרם הסתיימו משחקים עם ניחושים — יופיע כאן פירוט הביצועים שלך.
      </div>
    )
  }

  return (
    <div className="card animate-in" style={{ padding: 'var(--space-4)' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 12 }}>
        ביצועים
      </h3>

      {/* Stacked horizontal bar */}
      <div
        style={{
          display: 'flex',
          height: 14,
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          background: 'var(--color-bg-elevated)',
          marginBottom: 14
        }}
      >
        {buckets.map((b) =>
          b.count > 0 ? (
            <div
              key={b.key}
              style={{
                flexGrow: b.count,
                background: b.color,
                transition: 'all 0.3s ease'
              }}
              title={`${b.label}: ${b.count}`}
            />
          ) : null
        )}
      </div>

      {/* Counts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {buckets.map((b) => (
          <div
            key={b.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px 6px',
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <span aria-hidden style={{ fontSize: 18 }}>
              {b.emoji}
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-text)' }}>
              {b.count}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
