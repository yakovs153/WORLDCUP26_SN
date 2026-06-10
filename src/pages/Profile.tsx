import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useUserDoc } from '../hooks/useUserDoc'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { useToast } from '../components/Toast'
import StatsBreakdown from '../components/StatsBreakdown'
import CountUp from '../components/CountUp'
import NemesisCard from '../components/NemesisCard'
import StreaksBadges from '../components/StreaksBadges'
import { useIsAdmin } from '../admin/AdminGate'
import { useAppConfig } from '../hooks/useAppConfig'
import { useLivePoints } from '../hooks/useLivePoints'
import { setDepartment } from '../lib/departments'
import { updateDisplayName, updatePhoto, fileToAvatarDataUrl } from '../lib/profile'
import { useMemo } from 'react'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { data } = useUserDoc(user?.uid ?? null)
  const { matches } = useMatches()
  const { byMatchId } = usePredictions(user?.uid ?? null)
  const toast = useToast()
  const isAdmin = useIsAdmin()
  const cfg = useAppConfig()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Total points = stored value (refreshed by liveSync every 2 min when a match
  // finishes) + provisional delta from any match currently in progress.
  // Mirrors the leaderboard's calculation so the two numbers agree.
  const uids = useMemo(() => (user?.uid ? [user.uid] : []), [user?.uid])
  const liveDelta = useLivePoints(matches, cfg.scoring, uids, cfg.analystOverrides)
  const livePoints = (data?.totalPoints ?? 0) + (user?.uid ? (liveDelta.get(user.uid) || 0) : 0)

  const changeDept = async (dept: string) => {
    if (!user || !dept) return
    try { await setDepartment(user.uid, dept); toast.show('המחלקה עודכנה ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'עדכון נכשל', 'error') }
  }

  const saveName = async () => {
    if (!user) return
    setBusy(true)
    try { await updateDisplayName(user.uid, nameDraft); toast.show('השם עודכן ✓', 'success'); setEditingName(false) }
    catch (e) { toast.show(e instanceof Error ? e.message : 'עדכון נכשל', 'error') }
    finally { setBusy(false) }
  }

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setBusy(true)
    try { const url = await fileToAvatarDataUrl(file); await updatePhoto(user.uid, url); toast.show('התמונה עודכנה ✓', 'success') }
    catch (err) { toast.show(err instanceof Error ? err.message : 'העלאה נכשלה', 'error') }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  if (!user) return null

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>פרופיל</h1>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {data?.photoURL ? (
            <img src={data.photoURL} alt="" width={60} height={60} style={{ borderRadius: '50%', objectFit: 'cover', width: 60, height: 60 }} />
          ) : (
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--color-primary)', color: 'var(--color-text-inverse)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 24 }}>
              {(data?.displayName || user.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={busy} title="החלף תמונה"
            style={{ position: 'absolute', bottom: -4, insetInlineEnd: -4, width: 26, height: 26, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', fontSize: 13, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            📷
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={nameDraft} maxLength={40} onChange={(e) => setNameDraft(e.target.value)} autoFocus
                style={{ flex: 1, minWidth: 0, padding: '8px 10px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: 16, outline: 'none' }} />
              <button className="btn" onClick={saveName} disabled={busy || !nameDraft.trim()} style={{ padding: '8px 12px' }}>שמור</button>
              <button onClick={() => setEditingName(false)} className="btn-ghost" style={{ padding: '8px 10px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>✕</button>
            </div>
          ) : (
            <div style={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              {data?.displayName || 'משתמש'}
              <button onClick={() => { setNameDraft(data?.displayName || ''); setEditingName(true) }} title="ערוך שם"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.7 }}>✏️</button>
            </div>
          )}
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


      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--color-primary)' }}>
          <CountUp value={livePoints} />
        </div>
        <div className="text-muted" style={{ fontSize: 13 }}>סך נקודות</div>
      </div>

      <NemesisCard />

      <StreaksBadges matches={matches} byMatchId={byMatchId} />

      <StatsBreakdown matches={matches} byMatchId={byMatchId} />

      <Link
        to="/surveys"
        className="btn-ghost btn-block"
        style={{ padding: '12px 16px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-text)' }}
      >
        🗳️ סקרים והצבעות ←
      </Link>

      <Link
        to="/wrap"
        className="btn-ghost btn-block"
        style={{ padding: '12px 16px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-text)' }}
      >
        📊 סיכום העונה שלי ←
      </Link>

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

