import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { DEMO_MODE } from '../firebase'
import { useAppConfig } from '../hooks/useAppConfig'
import ThemeToggle from '../components/ThemeToggle'
import CubeMark from '../components/CubeMark'

export default function Login() {
  const { user, signInEmail } = useAuth()
  const cfg = useAppConfig()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)
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

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="glow-bg" aria-hidden />

      <div style={{ position: 'absolute', top: 'var(--space-4)', insetInlineEnd: 'var(--space-4)' }}>
        <ThemeToggle />
      </div>

      <div
        className="glass animate-in"
        style={{
          width: 'min(400px, 92vw)',
          margin: 'auto',
          padding: 'var(--space-6) var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          textAlign: 'center'
        }}
      >
        {logoFailed ? (
          <span style={{ margin: '0 auto' }}><CubeMark size={56} /></span>
        ) : (
          <img
            src="/logo.png"
            alt="StoreNext"
            style={{ display: 'block', margin: '0 auto', maxHeight: 64, maxWidth: '70%' }}
            onError={() => setLogoFailed(true)}
          />
        )}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1.5 }}>{cfg.content.tournamentName}</h1>
          <p className="text-muted" style={{ marginTop: 4 }}>{cfg.content.tagline}</p>
        </div>

        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FieldInput type="email" placeholder="אימייל" value={email} onChange={setEmail} autoComplete="email" />
          <FieldInput type="password" placeholder="סיסמה" value={password} onChange={setPassword} autoComplete="current-password" />
          <button type="submit" className="btn btn-block" disabled={busy || !email || !password}>
            {busy ? '…' : 'התחברות'}
          </button>
        </form>

        {err && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{err}</div>}

        {DEMO_MODE && (
          <button
            onClick={() => { window.location.href = `${import.meta.env.BASE_URL}?demo=1` }}
            className="btn-ghost btn-block"
            style={{ padding: '10px 16px', border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13 }}
          >
            ⚡ כניסה מהירה לדמו
          </button>
        )}

        <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          עוד אין חשבון? <Link to="/register">להרשמה</Link>
        </div>
        <div style={{ fontSize: 13 }}>
          <Link to="/rules" style={{ color: 'var(--color-text-muted)' }}>איך משחקים? כללי המשחק ←</Link>
        </div>
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
