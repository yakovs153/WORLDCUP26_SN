import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useUserDoc } from '../hooks/useUserDoc'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { useToast } from '../components/Toast'
import StatsBreakdown from '../components/StatsBreakdown'
import { useIsAdmin } from '../admin/AdminGate'
import { useAppConfig } from '../hooks/useAppConfig'
import { setDepartment } from '../lib/departments'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { data } = useUserDoc(user?.uid ?? null)
  const { matches } = useMatches()
  const { byMatchId } = usePredictions(user?.uid ?? null)
  const toast = useToast()
  const isAdmin = useIsAdmin()
  const cfg = useAppConfig()

  const changeDept = async (dept: string) => {
    if (!user || !dept) return
    try { await setDepartment(user.uid, dept); toast.show('המחלקה עודכנה ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'עדכון נכשל', 'error') }
  }

  if (!user) return null

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>פרופיל</h1>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {user.photoURL ? (
          <img src={user.photoURL} alt="" width={60} height={60} style={{ borderRadius: '50%' }} />
        ) : (
          <div
            style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--color-primary)',
              color: 'var(--color-text-inverse)',
              display: 'grid', placeItems: 'center',
              fontWeight: 900, fontSize: 24
            }}
          >
            {(data?.displayName || user.email || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{data?.displayName || 'משתמש'}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>{user.email}</div>
        </div>
      </div>

      {/* Department */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>🏢</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>המחלקה שלי</div>
          {!data?.department && <div style={{ fontSize: 12, color: 'var(--color-accent)' }}>בחר מחלקה כדי להשתתף בתחרות בין המחלקות</div>}
        </div>
        <select
          value={data?.department || ''}
          onChange={(e) => changeDept(e.target.value)}
          style={{ padding: '8px 10px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', outline: 'none' }}
        >
          <option value="" disabled>בחר…</option>
          {cfg.departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>


      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', gap: 8 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--color-primary)' }}>
            {data?.totalPoints ?? 0}
          </div>
          <div className="text-muted" style={{ fontSize: 13 }}>סך נקודות</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>
            {data?.predictionsCount ?? 0}
          </div>
          <div className="text-muted" style={{ fontSize: 13 }}>סך ניחושים</div>
        </div>
      </div>

      <StatsBreakdown matches={matches} byMatchId={byMatchId} />

      <Link
        to="/rules"
        className="btn-ghost btn-block"
        style={{
          padding: '12px 16px',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          color: 'var(--color-text)'
        }}
      >
        כללי המשחק ←
      </Link>

      {isAdmin && (
        <Link
          to="/admin"
          className="animate-in"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            background: 'color-mix(in srgb, var(--color-primary) 14%, var(--color-bg-elevated))',
            border: '1px solid color-mix(in srgb, var(--color-primary) 60%, var(--color-border-strong))',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            textDecoration: 'none',
            fontWeight: 800
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            פאנל ניהול
          </span>
          <span style={{ color: 'var(--color-primary)' }}>←</span>
        </Link>
      )}

      <button onClick={signOut} className="btn-ghost btn-block"
              style={{ padding: '12px 16px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
        התנתקות
      </button>
    </div>
  )
}
