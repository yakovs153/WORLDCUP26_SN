import { useEffect, useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'
import { DEFAULT_APP_CONFIG, type ThemeConfig } from '../types'

const PRESETS: { name: string; theme: ThemeConfig }[] = [
  {
    name: 'StoreNext (ברירת מחדל)',
    theme: DEFAULT_APP_CONFIG.theme
  },
  {
    name: 'כחול ים',
    theme: { primary: '#0ea5e9', accent: '#facc15', bg: '#0b1426', surface: '#152340', text: '#f1f5f9', danger: '#ef4444' }
  },
  {
    name: 'ירוק יער',
    theme: { primary: '#22c55e', accent: '#fbbf24', bg: '#0a1f1a', surface: '#173329', text: '#ecfdf5', danger: '#ef4444' }
  },
  {
    name: 'בהיר (יום)',
    theme: { primary: '#dc2626', accent: '#f59e0b', bg: '#fafafa', surface: '#ffffff', text: '#0f172a', danger: '#ef4444' }
  }
]

export default function AdminTheme() {
  const cfg = useAppConfig()
  const toast = useToast()

  const [theme, setTheme] = useState<ThemeConfig>(cfg.theme)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTheme(cfg.theme)
  }, [cfg.theme])

  const dirty = JSON.stringify(theme) !== JSON.stringify(cfg.theme)

  const save = async () => {
    setSaving(true)
    try {
      await patchAppConfig({ theme })
      toast.show('עיצוב עודכן ✓', 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Presets */}
      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 12 }}>
          ערכות צבעים מוכנות
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setTheme(p.theme)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'right'
              }}
            >
              <SwatchPair primary={p.theme.primary} bg={p.theme.bg} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Per-color pickers */}
      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 12 }}>
          התאמה אישית
        </h3>
        <ColorRow label="צבע ראשי (CTA, מנצחים)" hex={theme.primary} onChange={(v) => setTheme({ ...theme, primary: v })} />
        <ColorRow label="צבע משני (הדגשות)" hex={theme.accent} onChange={(v) => setTheme({ ...theme, accent: v })} />
        <ColorRow label="רקע ראשי" hex={theme.bg} onChange={(v) => setTheme({ ...theme, bg: v })} />
        <ColorRow label="רקע כרטיסים" hex={theme.surface} onChange={(v) => setTheme({ ...theme, surface: v })} />
        <ColorRow label="צבע טקסט" hex={theme.text} onChange={(v) => setTheme({ ...theme, text: v })} />
        <ColorRow label="צבע אזהרה" hex={theme.danger} onChange={(v) => setTheme({ ...theme, danger: v })} />
      </section>

      {/* Live preview note */}
      <p className="text-muted" style={{ fontSize: 12, textAlign: 'center' }}>
        💡 שינויים מוצגים בתצוגה מקדימה. לחץ "שמירה" כדי לפרסם לכל המשתמשים.
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={save} disabled={!dirty || saving}>
          {saving ? 'שומר…' : 'שמירה ופרסום'}
        </button>
        <button
          className="btn-ghost"
          onClick={() => setTheme(DEFAULT_APP_CONFIG.theme)}
          style={{ padding: '12px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}
        >
          איפוס
        </button>
      </div>

      {/* Live preview applied here too */}
      <PreviewBox theme={theme} />
    </div>
  )
}

function ColorRow({ label, hex, onChange }: { label: string; hex: string; onChange: (v: string) => void }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 10,
        alignItems: 'center',
        padding: '10px 0',
        borderTop: '1px solid var(--color-border)'
      }}
    >
      <span style={{ fontSize: 14 }}>{label}</span>
      <input
        type="text"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        style={{
          width: 90,
          padding: '6px 8px',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12,
          fontFamily: 'monospace',
          textAlign: 'center',
          outline: 'none',
          direction: 'ltr'
        }}
      />
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 40, height: 36, padding: 0, border: 'none', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer' }}
      />
    </div>
  )
}

function SwatchPair({ primary, bg }: { primary: string; bg: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <span style={{ width: 18, height: 18, background: bg }} />
      <span style={{ width: 18, height: 18, background: primary }} />
    </span>
  )
}

function PreviewBox({ theme }: { theme: ThemeConfig }) {
  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        background: theme.surface,
        border: `1px solid ${theme.primary}`,
        borderRadius: 'var(--radius-md)',
        color: theme.text
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>תצוגה מקדימה</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 700 }}>ברזיל 2 - 1 צרפת</span>
        <span
          style={{
            background: theme.primary,
            color: theme.bg,
            padding: '4px 10px',
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 12
          }}
        >
          +5 נק'
        </span>
      </div>
    </div>
  )
}
