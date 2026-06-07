import { useMemo, useState } from 'react'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useMatches } from '../hooks/useMatches'
import { useToast } from '../components/Toast'
import { stageLabel, formatTimeHe, formatDateHe, dateKey } from '../lib/format'
import FlagIcon from '../components/FlagIcon'
import type { Match, MatchStatus } from '../types'

/**
 * Admin override for match results. liveSync respects matches with
 * manualOverride=true and won't clobber their score/status. Useful when:
 *  - football-data API is late/wrong
 *  - Need to set a result for a test/playground game
 *  - Correcting a wrong sync (with a follow-up rescore from the rescore action)
 */
export default function AdminMatches() {
  const { matches, loading } = useMatches()
  const toast = useToast()
  const grouped = useMemo(() => groupByDate(matches), [matches])

  if (loading) {
    return <div className="card" style={{ padding: 16 }}>טוען משחקים…</div>
  }
  if (!matches.length) {
    return <div className="card" style={{ padding: 16 }}>אין משחקים עדיין.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card" style={{ padding: 'var(--space-3)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 6 }}>
          🎯 עדכון תוצאות ידני
        </h3>
        <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
          הזנת תוצאה ידנית תינעל ולא תידרס ע״י סנכרון אוטומטי. שמור — והסנכרון הבא יחשב את הנקודות.
          ניתן להסיר את ההתערבות ולחזור לסנכרון מהאתר החיצוני.
          <br />
          <strong>שים לב:</strong> אם המשחק כבר נוקד, שינוי התוצאה לא יחשב נקודות מחדש אוטומטית — תידרש פעולת
          איפוס נקודות נפרדת (תיווסף בעתיד).
        </p>
      </section>

      {grouped.map((g) => (
        <section key={g.key} className="card" style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h4 style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 800 }}>{formatDateHe(g.date)}</h4>
          {g.matches.map((m) => <MatchRow key={m.id} match={m} onSaved={() => toast.show('עודכן ✓', 'success')} onError={(e) => toast.show(e, 'error')} />)}
        </section>
      ))}
    </div>
  )
}

function MatchRow({ match, onSaved, onError }: { match: Match; onSaved: () => void; onError: (msg: string) => void }) {
  const [home, setHome] = useState<string>(match.homeScore == null ? '' : String(match.homeScore))
  const [away, setAway] = useState<string>(match.awayScore == null ? '' : String(match.awayScore))
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [venue, setVenue] = useState<string>(match.venue ?? '')
  const [saving, setSaving] = useState(false)
  const overridden = !!match.manualOverride

  const dirty =
    home !== (match.homeScore == null ? '' : String(match.homeScore)) ||
    away !== (match.awayScore == null ? '' : String(match.awayScore)) ||
    status !== match.status ||
    venue !== (match.venue ?? '')

  const save = async () => {
    setSaving(true)
    try {
      const hs = home === '' ? null : Math.max(0, parseInt(home, 10) || 0)
      const as = away === '' ? null : Math.max(0, parseInt(away, 10) || 0)
      let winner: string | null = null
      if (status === 'FINISHED' && hs != null && as != null) {
        winner = hs > as ? 'HOME_TEAM' : hs < as ? 'AWAY_TEAM' : 'DRAW'
      }
      await setDoc(
        doc(db, 'matches', match.id),
        {
          homeScore: hs,
          awayScore: as,
          status,
          winner,
          venue: venue.trim() || null,
          manualOverride: true,
          minute: status === 'LIVE' ? (match.minute ?? null) : null,
          lastUpdated: serverTimestamp()
        },
        { merge: true }
      )
      // Reset scored flag so next liveSync run will score this match
      const stateRef = doc(db, 'appState', 'syncState')
      const stateSnap = await getDoc(stateRef)
      const scored = (stateSnap.exists() ? (stateSnap.data().scored || {}) : {}) as Record<string, boolean>
      delete scored[match.id]
      await setDoc(stateRef, { scored }, { merge: true })
      onSaved()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'שמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  const clearOverride = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'matches', match.id), { manualOverride: false, lastUpdated: serverTimestamp() }, { merge: true })
      onSaved()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'שחרור נכשל')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '10px 6px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Top row: time, teams, score, status, save/override */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto auto auto auto',
          gap: 8,
          alignItems: 'center',
          fontSize: 13
        }}
      >
        <span style={{ color: 'var(--color-text-muted)', fontSize: 11, minWidth: 48 }}>
          {formatTimeHe(match.kickoff.toDate())}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <FlagIcon flag={match.homeTeam.flag} code={match.homeTeam.code} size={18} />
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.homeTeam.name}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>–</span>
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.awayTeam.name}</span>
          <FlagIcon flag={match.awayTeam.flag} code={match.awayTeam.code} size={18} />
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginInlineStart: 4 }}>{stageLabel(match.stage, match.group)}</span>
        </div>
        <input
          type="number"
          min={0}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          style={inp}
          aria-label={`שערים ${match.homeTeam.name}`}
        />
        <input
          type="number"
          min={0}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          style={inp}
          aria-label={`שערים ${match.awayTeam.name}`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          style={{ ...inp, width: 80, padding: '6px 4px' }}
        >
          <option value="SCHEDULED">עתידי</option>
          <option value="LIVE">חי</option>
          <option value="FINISHED">סופי</option>
          <option value="POSTPONED">נדחה</option>
        </select>
        <button
          className="btn"
          onClick={save}
          disabled={!dirty || saving}
          style={{ padding: '6px 10px', fontSize: 12 }}
        >
          {saving ? '…' : 'שמירה'}
        </button>
        {overridden ? (
          <button
            onClick={clearOverride}
            disabled={saving}
            title="שחרר מהתערבות ידנית — הסנכרון יחזור לשלוט"
            style={{ padding: '6px 8px', fontSize: 11, background: 'transparent', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)' }}
          >
            ✕ ידני
          </button>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 40, textAlign: 'center' }}>אוטו׳</span>
        )}
      </div>
      {/* Bottom row: editable venue */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingInlineStart: 56 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>📍 אצטדיון:</span>
        <input
          type="text"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="לדוגמה: אצטדיון אצטקה, מקסיקו סיטי"
          aria-label="שם האצטדיון"
          style={{
            flex: 1,
            padding: '4px 8px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontSize: 12,
            outline: 'none'
          }}
        />
      </div>
    </div>
  )
}

const inp = {
  width: 48,
  padding: '6px 8px',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  fontSize: 14,
  fontWeight: 700,
  textAlign: 'center' as const,
  outline: 'none'
}

function groupByDate(matches: Match[]): { key: string; date: Date; matches: Match[] }[] {
  const map = new Map<string, { date: Date; matches: Match[] }>()
  for (const m of matches) {
    const d = m.kickoff.toDate()
    const k = dateKey(d)
    if (!map.has(k)) map.set(k, { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), matches: [] })
    map.get(k)!.matches.push(m)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, date: v.date, matches: v.matches }))
}
