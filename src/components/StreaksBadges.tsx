import { useMemo } from 'react'
import { dateKey } from '../lib/format'
import type { Match, Prediction } from '../types'

interface Badge { emoji: string; label: string }

/** Streak + earned badges, computed from the user's scored predictions. */
export default function StreaksBadges({ matches, byMatchId }: { matches: Match[]; byMatchId: Record<string, Prediction> }) {
  const { streak, badges, hasData } = useMemo(() => {
    const finished = matches
      .filter((m) => m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null)
      .sort((a, b) => b.kickoff.toMillis() - a.kickoff.toMillis())

    // current streak: consecutive most-recent finished matches the user scored on
    let streak = 0
    for (const m of finished) {
      const p = byMatchId[m.id]
      if (p && (p.points ?? 0) > 0) streak++
      else break
    }

    const withPred = finished.map((m) => ({ m, p: byMatchId[m.id] })).filter((x) => x.p)
    const badges: Badge[] = []
    if (withPred.some(({ m, p }) => p.homeScore === m.homeScore && p.awayScore === m.awayScore)) badges.push({ emoji: '🎯', label: 'צלף — תוצאה מדויקת' })
    if (streak >= 3) badges.push({ emoji: '🔥', label: `רצף חם · ${streak}` })

    // perfect day: a calendar day with ≥2 scored predictions, all > 0
    const byDay = new Map<string, { total: number; good: number }>()
    for (const { m, p } of withPred) {
      const k = dateKey(m.kickoff.toDate())
      const cur = byDay.get(k) || { total: 0, good: 0 }
      cur.total++; if ((p.points ?? 0) > 0) cur.good++
      byDay.set(k, cur)
    }
    if ([...byDay.values()].some((d) => d.total >= 2 && d.total === d.good)) badges.push({ emoji: '💯', label: 'יום מושלם' })

    const total = withPred.reduce((s, { p }) => s + (p.points ?? 0), 0)
    if (total >= 50) badges.push({ emoji: '🏅', label: '50+ נקודות' })

    return { streak, badges, hasData: finished.length > 0 }
  }, [matches, byMatchId])

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🔥 רצף ותגים</h3>
      {!hasData ? (
        <p className="text-muted" style={{ fontSize: 13 }}>התגים ייפתחו עם תחילת המשחקים. בהצלחה!</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span style={{ fontSize: 22 }}>🔥</span>
            <span>רצף נוכחי: <b style={{ color: 'var(--color-primary)' }}>{streak}</b> משחקים עם נקודות</span>
          </div>
          {badges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {badges.map((b, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-full)', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', fontSize: 13, fontWeight: 700 }}>
                  <span style={{ fontSize: 16 }}>{b.emoji}</span>{b.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
