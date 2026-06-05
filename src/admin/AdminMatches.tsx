import { useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import { saveMatchResult, resumeAutoSync } from '../lib/matchesAdmin'
import { importOfficialSchedule } from '../lib/importSchedule'
import { useToast } from '../components/Toast'
import FlagIcon from '../components/FlagIcon'
import { formatDateHe, formatTimeHe, stageLabel } from '../lib/format'
import type { Match, MatchStatus } from '../types'
import { DEMO_MODE } from '../firebase'

const STATUSES: { value: MatchStatus; label: string }[] = [
  { value: 'SCHEDULED', label: 'טרם החל' },
  { value: 'LIVE', label: '🔴 חי' },
  { value: 'FINISHED', label: 'הסתיים' },
  { value: 'POSTPONED', label: 'נדחה' }
]

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
          עדכון תוצאה או סטטוס ידנית. עדכון ידני נועל את המשחק מפני סנכרון אוטומטי עד שתבחר «↻ חזרה לאוטומטי».
          {DEMO_MODE && ' (מצב דמו — נשמר מקומית בדפדפן.)'}
        </p>
        {!DEMO_MODE && (
          <button className="btn-ghost" onClick={doImport} disabled={importing}
            style={{ padding: '8px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
            {importing ? 'מייבא…' : '📥 ייבוא הלוח הרשמי (104 משחקים)'}
          </button>
        )}
      </section>


      {loading ? (
        <div className="text-muted" style={{ textAlign: 'center', padding: 20 }}>טוען…</div>
      ) : (
        matches.map((m) => <MatchRow key={m.id} match={m} toast={toast} />)
      )}
    </div>
  )
}

function MatchRow({ match, toast }: { match: Match; toast: ReturnType<typeof useToast> }) {
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [home, setHome] = useState<string>(match.homeScore?.toString() ?? '')
  const [away, setAway] = useState<string>(match.awayScore?.toString() ?? '')
  const [busy, setBusy] = useState(false)

  const showScore = status === 'LIVE' || status === 'FINISHED'

  const save = async () => {
    setBusy(true)
    try {
      await saveMatchResult(match.id, {
        status,
        homeScore: showScore && home !== '' ? Math.max(0, parseInt(home, 10)) : null,
        awayScore: showScore && away !== '' ? Math.max(0, parseInt(away, 10)) : null
      })
      toast.show(`עודכן: ${match.homeTeam.code} ${home || '-'}:${away || '-'} ${match.awayTeam.code} ✓`, 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>
        <span>{stageLabel(match.stage, match.group)}</span>
        <span>{formatDateHe(match.kickoff.toDate())} · {formatTimeHe(match.kickoff.toDate())}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <FlagIcon flag={match.homeTeam.flag} code={match.homeTeam.code} size={22} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{match.homeTeam.name}</span>
        </span>

        {showScore && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ScoreBox value={home} onChange={setHome} />
            <span style={{ color: 'var(--color-text-muted)' }}>:</span>
            <ScoreBox value={away} onChange={setAway} />
          </span>
        )}

        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{match.awayTeam.name}</span>
          <FlagIcon flag={match.awayTeam.flag} code={match.awayTeam.code} size={22} />
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          style={{ flex: 1, padding: '8px 10px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}
        >
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="btn" style={{ padding: '8px 16px' }} disabled={busy} onClick={save}>
          {busy ? '…' : 'שמירה'}
        </button>
        <button
          className="btn-ghost"
          title="חזרה לסנכרון אוטומטי"
          style={{ padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}
          onClick={async () => { try { await resumeAutoSync(match.id); toast.show('חזר לאוטומטי ✓', 'success') } catch (e) { toast.show(e instanceof Error ? e.message : 'נכשל', 'error') } }}
        >
          ↻
        </button>
      </div>
    </div>
  )
}

function ScoreBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={30}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 48, padding: '6px', textAlign: 'center',
        background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-md)', color: 'var(--color-primary)',
        fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, outline: 'none'
      }}
    />
  )
}

