import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function Login() {
  const { user, signInEmail, signInGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const loc = useLocation() as { state?: { from?: { pathname: string } } }

  if (user) return <Navigate to={loc.state?.from?.pathname || '/'} replace />

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await signInEmail(email, password)
    } catch (e2) {
      setErr(parseAuthError(e2))
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    setBusy(true)
    setErr(null)
    try {
      await signInGoogle()
    } catch (e2) {
      setErr(parseAuthError(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '0 var(--space-4)' }}>
      <img
        src="/logo.png"
        alt="StoreNext"
        style={{ display: 'block', margin: '0 auto', maxHeight: 64, maxWidth: '70%' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <h1 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', letterSpacing: 1.5, marginTop: 12 }}>
        מונדיאל 2026
      </h1>
      <p className="text-muted" style={{ textAlign: 'center', marginTop: -8 }}>
        משחק ניחושים פנימי
      </p>

      <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FieldInput type="email" placeholder="אימייל" value={email} onChange={setEmail} autoComplete="email" />
        <FieldInput type="password" placeholder="סיסמה" value={password} onChange={setPassword} autoComplete="current-password" />
        <button type="submit" className="btn btn-block" disabled={busy || !email || !password}>
          {busy ? '…' : 'התחברות'}
        </button>
      </form>

      <button onClick={handleGoogle} className="btn-ghost btn-block" disabled={busy}
              style={{ padding: '12px 16px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
        התחברות עם Google
      </button>

      {err && <div style={{ color: 'var(--color-danger)', textAlign: 'center', fontSize: 13 }}>{err}</div>}

      <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
        עוד אין חשבון? <Link to="/register">להרשמה</Link>
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, marginTop: 8 }}>
        <Link to="/rules" style={{ color: 'var(--color-text-muted)' }}>איך משחקים? כללי המשחק ←</Link>
      </div>
    </div>
  )
}

function FieldInput({
  type, placeholder, value, onChange, autoComplete
}: {
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '12px 14px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-md)',
        outline: 'none'
      }}
    />
  )
}

function parseAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('עובדי החברה') || msg.includes('ארגונית')) return msg
  if (msg.includes('אימייל לא תקין')) return msg
  if (msg.includes('auth/invalid-credential')) return 'אימייל או סיסמה שגויים'
  if (msg.includes('auth/user-not-found')) return 'משתמש לא נמצא'
  if (msg.includes('auth/wrong-password')) return 'סיסמה שגויה'
  if (msg.includes('auth/too-many-requests')) return 'יותר מדי ניסיונות, נסה שוב מאוחר יותר'
  return 'לא הצלחנו להתחבר. נסה שוב'
}
