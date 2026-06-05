import { useState } from 'react'
import { Link } from 'react-router-dom'
import AdminContent from '../admin/AdminContent'
import AdminDepartments from '../admin/AdminDepartments'
import AdminScoring from '../admin/AdminScoring'
import AdminSurveys from '../admin/AdminSurveys'
import AdminPlayers from '../admin/AdminPlayers'
import AdminPredictions from '../admin/AdminPredictions'
import AdminAccess from '../admin/AdminAccess'

type Tab = 'content' | 'departments' | 'scoring' | 'players' | 'polls' | 'predictions' | 'access'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'content', label: 'תוכן',     icon: '📝' },
  { key: 'departments', label: 'מחלקות', icon: '🏢' },
  { key: 'scoring', label: 'ניקוד',    icon: '🧮' },
  { key: 'players', label: 'שחקנים',   icon: '👟' },
  { key: 'polls',   label: 'סקרים',    icon: '📋' },
  { key: 'predictions', label: 'ניחושים', icon: '📋' },
  { key: 'access',  label: 'גישה',     icon: '🔒' }
]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('content')

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

      {tab === 'content' && <AdminContent />}
      {tab === 'departments' && <AdminDepartments />}
      {tab === 'scoring' && <AdminScoring />}
      {tab === 'players' && <AdminPlayers />}
      {tab === 'polls' && <AdminSurveys />}
      {tab === 'predictions' && <AdminPredictions />}
      {tab === 'access' && <AdminAccess />}

      {tab === 'predictions' && (
        <section className="card" style={{ border: '1px solid var(--color-danger)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, color: 'var(--color-danger)' }}>⚠️ אזור מסוכן — איפוס התחרות</h3>
          <p className="text-muted" style={{ fontSize: 13 }}>
            מחיקת כל הניחושים והנקודות והתחלה מאפס (לוח המשחקים, החשבונות והפלייגראונד נשמרים). מוגן בסיסמה ומתבצע רק מ-GitHub Actions כדי שלא יקרה בטעות.
          </p>
          <a href="https://github.com/yakovs153/WORLDCUP26_SN/actions/workflows/reset.yml" target="_blank" rel="noopener noreferrer"
            className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: 13, border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', textDecoration: 'none' }}>
            פתח את מסך האיפוס (Run workflow → הקלד סיסמה) ↗
          </a>
        </section>
      )}
    </div>
  )
}
