import { useState } from 'react'
import { Link } from 'react-router-dom'
import AdminScoring from '../admin/AdminScoring'
import AdminTheme from '../admin/AdminTheme'
import AdminPolls from '../admin/AdminPolls'
import AdminIcons from '../admin/AdminIcons'
import AdminPlayers from '../admin/AdminPlayers'
import AdminAccess from '../admin/AdminAccess'

type Tab = 'scoring' | 'theme' | 'polls' | 'icons' | 'players' | 'access'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'scoring', label: 'ניקוד',    icon: '🧮' },
  { key: 'theme',   label: 'עיצוב',    icon: '🎨' },
  { key: 'polls',   label: 'סקרים',    icon: '📊' },
  { key: 'icons',   label: 'אייקונים',  icon: '✨' },
  { key: 'players', label: 'שחקנים',   icon: '👟' },
  { key: 'access',  label: 'גישה',     icon: '🔒' }
]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('scoring')

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link
          to="/profile"
          className="btn-ghost"
          style={{
            padding: '6px 14px',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13
          }}
        >
          ← חזרה
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 26 }}>פאנל ניהול</h1>
      </div>

      <p className="text-muted" style={{ fontSize: 13, marginTop: -6 }}>
        שינויים נשמרים ומתעדכנים מיד עבור כל המשתמשים.
      </p>

      {/* Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
          padding: 4,
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--color-border)'
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 8px',
              borderRadius: 'var(--radius-full)',
              background: tab === t.key ? 'var(--color-surface)' : 'transparent',
              color: tab === t.key ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontWeight: 700,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'scoring' && <AdminScoring />}
      {tab === 'theme' && <AdminTheme />}
      {tab === 'polls' && <AdminPolls />}
      {tab === 'icons' && <AdminIcons />}
      {tab === 'players' && <AdminPlayers />}
      {tab === 'access' && <AdminAccess />}
    </div>
  )
}
