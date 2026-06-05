import { useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import { importOfficialSchedule } from '../lib/importSchedule'
import { useToast } from '../components/Toast'
import FlagIcon from '../components/FlagIcon'
import LiveBadge from '../components/LiveBadge'
import { formatDateHe, formatTimeHe, stageLabel } from '../lib/format'
import { DEMO_MODE } from '../firebase'

export default function AdminMatches() {
  const { matches, loading } = useMatches()
  const toast = useToast()
  const [importing, setImporting] = useState(false)

  const doImport = async () => {
    setImporting(true)
    try {
      const n = await importOfficialSchedule()
      toast.show(DEMO_MODE ? 'במצב דמו הלוח כבר טעון' : `יובאו ${n} משחקים ✓`, 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'הייבוא נכשל', 'error')
    } finally { setImporting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 6 }}>
          🗓️ ניהול משחקים
        </h3>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 10 }}>
          תוצאות, סטטוס, דקת משחק וכובשים מתעדכנים <strong>אוטומטית מהפיד החי</strong> — אין צורך (ואי-אפשר) לערוך ידנית.
          {DEMO_MODE && ' (מצב דמו — נתונים מקומיים בדפדפן.)'}
        </p>
        {!DEMO_MODE && (
          <button className="btn-ghost" onClick={doImport} disabled={importing}
            style={{ padding: '8px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
            {importing ? 'מייבא…' : '📥 ייבוא ראשוני של הלוח (104 משחקים)'}
          </button>
        )}
      </section>

      {loading ? (
        <div className="text-muted" style={{ textAlign: 'center', padding: 20 }}>טוען…</div>
      ) : (
        matches.map((m) => (
          <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>
              <span>{stageLabel(m.stage, m.group)}</span>
              <span>{formatDateHe(m.kickoff.toDate())} · {formatTimeHe(m.kickoff.toDate())}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <FlagIcon flag={m.homeTeam.flag} code={m.homeTeam.code} size={22} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.homeTeam.name}</span>
              </span>
              {m.status === 'SCHEDULED'
                ? <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{formatTimeHe(m.kickoff.toDate())}</span>
                : <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18 }}>{m.homeScore ?? 0} : {m.awayScore ?? 0}</span>
                    <LiveBadge status={m.status} />
                  </span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.awayTeam.name}</span>
                <FlagIcon flag={m.awayTeam.flag} code={m.awayTeam.code} size={22} />
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
