import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useAppConfig } from '../hooks/useAppConfig'

export default function Register() {
  const { user, registerEmail } = useAuth()
  const cfg = useAppConfig()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (user) return <Navigate to="/" replace />

  const handle = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setErr('סיסמה חייבת להיות באורך 6 תווים לפחות'); return }
    setBusy(true)
    setErr(null)
    try {
      await registerEmail(email, password, displayName.trim(), department || undefined)
    } catch (e2) {
      const m = e2 instanceof Error ? e2.message : String(e2)
      if (m.includes('email-already-in-use')) setErr('האימייל כבר בשימוש')
      else if (m.includes('invalid-email')) setErr('אימייל לא תקין')
      else setErr('הרשמה נכשלה. נסה שוב')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '0 var(--space-4)' }}>
      <img
        src="/logo.png"
        alt="StoreNext"
        style={{ display: 'block', margin: '0 auto', maxHeight: 56, maxWidth: '60%' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <h1 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', letterSpacing: 1.5 }}>
        הרשמה
      </h1>
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="שם להצגה (יופיע בדירוג)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={24}
          required
          style={fieldStyle}
        />
        <input type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} required style={fieldStyle} />
        <input type="password" placeholder="סיסמה (לפחות 6 תווים)" value={password} onChange={(e) => setPassword(e.target.value)} required style={fieldStyle} />
        <select value={department} onChange={(e) => setDepartment(e.target.value)} required style={fieldStyle}>
          <option value="" disabled>בחר מחלקה…</option>
          {cfg.departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn btn-block" disabled={busy || !email || !password || !displayName.trim() || !department}>
          {busy ? '…' : 'יצירת חשבון'}
        </button>
      </form>
      {err && <div style={{ color: 'var(--color-danger)', textAlign: 'center', fontSize: 13 }}>{err}</div>}
      <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
        כבר רשום? <Link to="/login">להתחברות</Link>
      </div>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  padding: '12px 14px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  outline: 'none'
}
