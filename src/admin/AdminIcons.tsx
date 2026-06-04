import { useEffect, useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'
import { DEFAULT_APP_CONFIG, type NavIconsConfig } from '../types'

const SUGGESTIONS = ['⚽', '🏆', '📋', '📊', '👤', '🎯', '🥇', '🥈', '🥉', '🎮', '⭐', '🔥', '⚡', '🚀', '🎁', '💎', '🏅']

export default function AdminIcons() {
  const cfg = useAppConfig()
  const toast = useToast()
  const [icons, setIcons] = useState<NavIconsConfig>(cfg.navIcons)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setIcons(cfg.navIcons)
  }, [cfg.navIcons])

  const dirty = JSON.stringify(icons) !== JSON.stringify(cfg.navIcons)

  const save = async () => {
    setSaving(true)
    try {
      await patchAppConfig({ navIcons: icons })
      toast.show('אייקונים עודכנו ✓')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error')
    } finally {
      setSaving(false)
    }
  }

  const SLOTS: { key: keyof NavIconsConfig; label: string }[] = [
    { key: 'matches', label: 'משחקים' },
    { key: 'bonus', label: 'בונוס' },
    { key: 'my', label: 'הניחושים שלי' },
    { key: 'leaderboard', label: 'דירוג' },
    { key: 'profile', label: 'פרופיל' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 12 }}>
          אייקוני ניווט תחתון
        </h3>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
          לחץ על אייקון מההצעות כדי לבחור, או הקלד אמוג'י משלך.
        </p>

        {SLOTS.map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 56px 1fr',
              alignItems: 'center',
              gap: 10,
              padding: '10px 0',
              borderTop: '1px solid var(--color-border)'
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
            <input
              type="text"
              maxLength={4}
              value={icons[key]}
              onChange={(e) => setIcons({ ...icons, [key]: e.target.value })}
              style={{
                width: 56,
                height: 48,
                textAlign: 'center',
                fontSize: 28,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setIcons({ ...icons, [key]: s })}
                  style={{
                    width: 34,
                    height: 34,
                    fontSize: 18,
                    background: icons[key] === s ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={save} disabled={!dirty || saving}>
          {saving ? 'שומר…' : 'שמירה'}
        </button>
        <button
          className="btn-ghost"
          onClick={() => setIcons(DEFAULT_APP_CONFIG.navIcons)}
          style={{ padding: '12px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}
        >
          איפוס
        </button>
      </div>
    </div>
  )
}
