import { useMemo } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useLeaderboard } from '../hooks/useLeaderboard'

/** "Nemesis" — the rival directly above you, and the gap to catch them. */
export default function NemesisCard() {
  const { user } = useAuth()
  const { entries } = useLeaderboard(200)

  const view = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.totalPoints - a.totalPoints)
    const idx = sorted.findIndex((e) => e.uid === user?.uid)
    if (idx < 0) return null
    if (idx === 0) return { leader: true as const }
    return { leader: false as const, above: sorted[idx - 1], gap: sorted[idx - 1].totalPoints - sorted[idx].totalPoints }
  }, [entries, user?.uid])

  if (!view) return null
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 22 }}>{view.leader ? '👑' : '🎯'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{view.leader ? 'אתה בפסגה!' : 'המרדף'}</div>
        <div className="text-muted" style={{ fontSize: 13 }}>
          {view.leader
            ? 'שמור על ההובלה — כולם רודפים אחריך.'
            : <>הבא בתור: <b style={{ color: 'var(--color-text)' }}>{view.above.displayName}</b> · פער של <b style={{ color: 'var(--color-primary)' }}>{view.gap}</b> נק׳</>}
        </div>
      </div>
    </div>
  )
}
