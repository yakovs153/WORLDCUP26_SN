import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'

/** Block the app until the user verifies their email. Auto-polls every 5s. */
export default function VerifyEmail() {
  const { user, resendVerification, refreshUser, signOut } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Auto-poll Firebase for verification status every 5s.
  useEffect(() => {
    const id = setInterval(() => { void refreshUser() }, 5000)
    return () => clearInterval(id)
  }, [refreshUser])

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  if (!user) return <Navigate to="/login" replace />
  if (user.emailVerified) return <Navigate to="/" replace />

  const resend = async () => {
    if (cooldown > 0) return
    setBusy(true)
    try { await resendVerification(); toast.show('המייל נשלח שוב — בדוק את התיבה (כולל ספאם)', 'success'); setCooldown(60) }
    catch (e) { toast.show(e instanceof Error ? e.message : 'שליחה נכשלה', 'error') }
    finally { setBusy(false) }
  }

  const check = async () => {
    setBusy(true)
    try { await refreshUser() } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'var(--space-4)' }}>
      <div className="glass animate-in" style={{ maxWidth: 400, padding: 'var(--space-5)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 54 }}>📧</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>אמת את כתובת המייל שלך</h1>
        <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
          שלחנו קישור אימות לכתובת:<br />
          <b style={{ color: 'var(--color-text)' }}>{user.email}</b>
          <br /><br />
          לחץ על הקישור במייל ואז חזור לכאן — הגישה תיפתח אוטומטית.
          <br />
          <span style={{ fontSize: 12 }}>(ייתכן והמייל הגיע לתיקיית הספאם)</span>
        </p>
        <button className="btn" onClick={check} disabled={busy} style={{ padding: '12px' }}>
          {busy ? 'בודק…' : 'בדקתי, רענן'}
        </button>
        <button onClick={resend} disabled={busy || cooldown > 0} className="btn-ghost" style={{ padding: '10px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
          {cooldown > 0 ? `שלח שוב בעוד ${cooldown}s` : 'שלח שוב'}
        </button>
        <button onClick={() => void signOut()} className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
          התנתקות
        </button>
      </div>
    </div>
  )
}
