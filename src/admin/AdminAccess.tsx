import { useEffect, useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'

export default function AdminAccess() {
  const cfg = useAppConfig()
  const toast = useToast()

  const [domains, setDomains] = useState<string[]>(cfg.allowedEmailDomains)
  const [emails, setEmails] = useState<string[]>(cfg.adminEmails)
  const [newDomain, setNewDomain] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDomains(cfg.allowedEmailDomains)
    setEmails(cfg.adminEmails)
  }, [cfg.allowedEmailDomains, cfg.adminEmails])

  const dirty =
    JSON.stringify(domains) !== JSON.stringify(cfg.allowedEmailDomains) ||
    JSON.stringify(emails) !== JSON.stringify(cfg.adminEmails)

  const save = async () => {
    setSaving(true)
    try {
      await patchAppConfig({ allowedEmailDomains: domains, adminEmails: emails })
      toast.show('הגדרות גישה נשמרו ✓')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^@/, '')
    if (!d || domains.includes(d)) return
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) {
      toast.show('דומיין לא תקין (לדוגמה: storenext.com)', 'error')
      return
    }
    setDomains([...domains, d])
    setNewDomain('')
  }

  const addEmail = () => {
    const e = newEmail.trim().toLowerCase()
    if (!e || emails.includes(e)) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.show('אימייל לא תקין', 'error')
      return
    }
    setEmails([...emails, e])
    setNewEmail('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Allowed email domains */}
      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 6 }}>
          🔒 דומיינים מורשים להרשמה
        </h3>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
          רק משתמשים עם אימייל מהדומיינים האלה יוכלו להירשם/להתחבר.
          אם הרשימה ריקה — כל אימייל מורשה (לא מומלץ).
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="storenext.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            style={inputStyle}
          />
          <button
            onClick={addDomain}
            className="btn"
            disabled={!newDomain.trim()}
            style={{ padding: '0 16px', fontSize: 14 }}
          >
            + הוספה
          </button>
        </div>

        {domains.length === 0 ? (
          <div
            style={{
              padding: '10px 14px',
              background: 'color-mix(in srgb, var(--color-danger) 15%, var(--color-bg-elevated))',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13
            }}
          >
            ⚠️ כל אימייל יכול להירשם. הוסף לפחות דומיין אחד כדי להגביל.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {domains.map((d) => (
              <Chip key={d} label={`@${d}`} onRemove={() => setDomains(domains.filter((x) => x !== d))} />
            ))}
          </div>
        )}
      </section>

      {/* Admin emails */}
      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 6 }}>
          ⚙️ אימיילים של אדמינים
        </h3>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
          רק אימיילים ברשימה הזו יראו את הקישור לפאנל הניהול. שים לב:
          ב-DEMO MODE כל המשתמשים הם אדמינים — זה רלוונטי רק לפרודקשן.
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <input
            type="email"
            placeholder="admin@storenext.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
            style={inputStyle}
          />
          <button
            onClick={addEmail}
            className="btn"
            disabled={!newEmail.trim()}
            style={{ padding: '0 16px', fontSize: 14 }}
          >
            + הוספה
          </button>
        </div>

        {emails.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 12, textAlign: 'center', padding: 8 }}>
            עדיין לא הוגדרו אדמינים.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {emails.map((e) => (
              <Chip key={e} label={e} onRemove={() => setEmails(emails.filter((x) => x !== e))} block />
            ))}
          </div>
        )}
      </section>

      <button className="btn btn-block" onClick={save} disabled={!dirty || saving}>
        {saving ? 'שומר…' : 'שמירת הגדרות גישה'}
      </button>
    </div>
  )
}

function Chip({ label, onRemove, block }: { label: string; onRemove: () => void; block?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-full)',
        fontSize: 13,
        fontWeight: 600,
        width: block ? '100%' : 'auto',
        justifyContent: block ? 'space-between' : 'flex-start'
      }}
    >
      <span>{label}</span>
      <button
        onClick={onRemove}
        aria-label="הסר"
        style={{
          width: 22,
          height: 22,
          display: 'inline-grid',
          placeItems: 'center',
          borderRadius: '50%',
          color: 'var(--color-danger)',
          fontSize: 16,
          lineHeight: 1
        }}
      >
        ×
      </button>
    </span>
  )
}

const inputStyle = {
  flex: 1,
  padding: '10px 12px',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  outline: 'none',
  fontSize: 14,
  direction: 'ltr' as const
}
