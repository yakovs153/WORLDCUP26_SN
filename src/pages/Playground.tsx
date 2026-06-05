import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import LiveBadge from '../components/LiveBadge'
import FlagIcon from '../components/FlagIcon'
import type { Match } from '../types'

/**
 * Hidden live-results playground (/playground). Watches a `playgroundMatches`
 * collection populated by scripts/playground-sync.mjs from a currently-live
 * competition — a safe way to verify the live pipeline before the World Cup.
 */

const DEMO_SAMPLE: (Match & { competition?: string })[] = [
  { id: 'd1', homeTeam: { name: 'ריאל מדריד', code: '', flag: '🇪🇸' }, awayTeam: { name: 'מנצ׳סטר סיטי', code: '', flag: '🏴' }, kickoff: { toDate: () => new Date() } as never, stage: 'GROUP', group: null, status: 'LIVE', homeScore: 2, awayScore: 1, competition: 'ליגת האלופות (דמו)' },
  { id: 'd2', homeTeam: { name: 'באיירן', code: '', flag: '🇩🇪' }, awayTeam: { name: 'פ.ס.ז׳', code: '', flag: '🇫🇷' }, kickoff: { toDate: () => new Date() } as never, stage: 'GROUP', group: null, status: 'SCHEDULED', homeScore: null, awayScore: null, competition: 'ליגת האלופות (דמו)' }
]

export default function Playground() {
  const [matches, setMatches] = useState<(Match & { competition?: string })[]>(DEMO_MODE ? DEMO_SAMPLE : [])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (DEMO_MODE) return
    const unsubM = onSnapshot(collection(db, 'playgroundMatches'), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) })) as (Match & { competition?: string })[]
      rows.sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())
      setMatches(rows)
    })
    const unsubMeta = onSnapshot(doc(db, 'playgroundMeta', 'main'), (s) => {
      const ts = s.data()?.updatedAt
      setUpdatedAt(ts?.toDate ? ts.toDate() : null)
    })
    return () => { unsubM(); unsubMeta() }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" className="btn-ghost" style={{ padding: '6px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13, textDecoration: 'none', color: 'inherit' }}>← חזרה</Link>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent)', letterSpacing: 1 }}>מגרש בדיקות · חי</span>
        </div>

        <header>
          <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 26 }}>🔬 בדיקת תוצאות חי</h1>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
            מסך נסתר לבדיקת זרימת התוצאות החיות ממשחק אמיתי שמתרחש כעת — לפני שהמונדיאל מתחיל.
            {updatedAt && <> · עודכן {updatedAt.toLocaleTimeString('he-IL')}</>}
          </p>
        </header>

        {matches.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔬</div>
            <h3>אין נתונים עדיין</h3>
            <p className="text-muted" style={{ marginTop: 8, fontSize: 13 }}>
              הרץ את סנכרון המגרש (Actions → Playground sync) על תחרות שמשחקת עכשיו, והמשחקים יופיעו כאן בזמן אמת.
            </p>
          </div>
        )}

        {matches.map((m) => (
          <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {m.competition && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>{m.competition}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
                <FlagIcon flag={m.homeTeam.flag} code={m.homeTeam.code} size={26} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.homeTeam.name}</span>
              </div>
              <div style={{ textAlign: 'center', minWidth: 64 }}>
                {m.status === 'SCHEDULED'
                  ? <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{m.kickoff.toDate().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                  : <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: m.status === 'LIVE' ? 'var(--color-primary)' : 'var(--color-text)' }}>{m.homeScore ?? 0} : {m.awayScore ?? 0}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.awayTeam.name}</span>
                <FlagIcon flag={m.awayTeam.flag} code={m.awayTeam.code} size={26} />
              </div>
            </div>
            {m.status !== 'SCHEDULED' && <div style={{ display: 'flex', justifyContent: 'center' }}><LiveBadge status={m.status} /></div>}
          </div>
        ))}
      </div>
    </div>
  )
}
