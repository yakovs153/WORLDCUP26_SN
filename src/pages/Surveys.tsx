import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppConfig } from '../hooks/useAppConfig'

export default function Surveys() {
  const cfg = useAppConfig()
  const surveys = useMemo(() => cfg.surveys.filter((s) => s.active && s.questions.length > 0), [cfg.surveys])

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 28 }}>🗳️ סקרים</h1>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          ענה על הסקרים וצפה בתוצאות בזמן אמת. התוצאות תמיד פומביות.
        </p>
      </header>

      {surveys.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🗳️</div>
          <h3>אין סקרים פעילים כרגע</h3>
          <p className="text-muted" style={{ marginTop: 8, fontSize: 13 }}>כשתפורסם שאלה חדשה — היא תופיע כאן.</p>
        </div>
      )}

      {surveys.map((s) => (
        <Link
          key={s.id}
          to={`/survey/${s.id}`}
          className="glass animate-in"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28 }}>📋</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>{s.questions.length} שאלות</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{s.title}</div>
            </div>
          </div>
          <span style={{ fontSize: 22, color: 'var(--color-primary)' }}>←</span>
        </Link>
      ))}
    </div>
  )
}
