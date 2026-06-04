import { useAuth } from '../auth/AuthProvider'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { LeaderboardRowSkeleton } from '../components/Skeleton'

export default function Leaderboard() {
  const { user } = useAuth()
  const { entries, loading } = useLeaderboard(100)

  if (loading)
    return (
      <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>טבלת דירוג</h1>
        <div className="card" style={{ padding: 0 }}>
          {[0, 1, 2, 3, 4].map((i) => <LeaderboardRowSkeleton key={i} />)}
        </div>
      </div>
    )

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>טבלת דירוג</h1>
      {entries.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          עוד אין משתמשים בדירוג
        </div>
      )}
      <div className="card stagger" style={{ padding: 0, overflow: 'hidden' }}>
        {entries.map((e) => {
          const me = user?.uid === e.uid
          return (
            <div
              key={e.uid}
              className="animate-in"
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr auto',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                background: me ? 'rgba(212,175,55,0.08)' : 'transparent',
                borderBottom: '1px solid var(--color-border)'
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: rankColor(e.rank) }}>
                {medal(e.rank) || e.rank}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {e.photoURL ? (
                  <img src={e.photoURL} alt="" width={32} height={32} style={{ borderRadius: '50%' }} />
                ) : (
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--color-bg-elevated)',
                      display: 'grid', placeItems: 'center',
                      fontWeight: 700, fontSize: 14
                    }}
                  >
                    {e.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700 }}>{e.displayName}{me && <span style={{ color: 'var(--color-primary)', marginRight: 6, fontSize: 12 }}>(אתה)</span>}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{e.predictionsCount} ניחושים</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-primary)' }}>
                {e.totalPoints}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function medal(rank: number): string | null {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}
function rankColor(rank: number): string {
  if (rank <= 3) return 'var(--color-primary)'
  return 'var(--color-text-muted)'
}
