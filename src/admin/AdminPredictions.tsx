import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { useAuth } from '../auth/AuthProvider'
import { getDemoMatches, getDemoPredictions, getDemoUser } from '../lib/demoData'
import { useToast } from '../components/Toast'
import type { Match, Prediction, UserDoc } from '../types'

interface Row {
  user: string; email: string; dept: string; match: string
  kickoff: string; pred: string; points: string; auto: string
}

const HEADERS = ['שם', 'אימייל', 'מחלקה', 'משחק', 'מועד', 'ניחוש', 'נקודות', 'אוטומטי']

function toRow(p: Prediction, m: Match | undefined, u: UserDoc | undefined): Row {
  return {
    user: u?.displayName ?? p.uid,
    email: u?.email ?? '',
    dept: u?.department ?? '',
    match: m ? `${m.homeTeam.name} - ${m.awayTeam.name}` : p.matchId,
    kickoff: m ? m.kickoff.toDate().toLocaleString('he-IL') : '',
    pred: `${p.homeScore}-${p.awayScore}`,
    points: p.points == null ? '' : String(p.points),
    auto: p.auto ? 'כן' : ''
  }
}

function exportCsv(rows: Row[]) {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
  const lines = [
    HEADERS.join(','),
    ...rows.map((r) => [r.user, r.email, r.dept, r.match, r.kickoff, r.pred, r.points, r.auto].map(esc).join(','))
  ]
  // BOM so Excel reads UTF-8 (Hebrew) correctly
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `predictions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminPredictions() {
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (DEMO_MODE) {
          const mById = new Map(getDemoMatches().map((m) => [m.id, m]))
          const preds = getDemoPredictions(user?.uid ?? 'demo')
          const u = getDemoUser(user?.uid ?? 'demo', user?.displayName ?? 'אני')
          const r = Object.values(preds).map((p) => toRow(p, mById.get(p.matchId), u))
          if (!cancelled) { setRows(r); setLoading(false) }
          return
        }
        const [pSnap, uSnap, mSnap] = await Promise.all([
          getDocs(collection(db, 'predictions')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'matches'))
        ])
        const users = new Map(uSnap.docs.map((d) => [d.id, d.data() as UserDoc]))
        const matches = new Map(mSnap.docs.map((d) => [d.id, d.data() as Match]))
        const r = pSnap.docs
          .map((d) => d.data() as Prediction)
          .map((p) => toRow(p, matches.get(p.matchId), users.get(p.uid)))
          .sort((a, b) => a.user.localeCompare(b.user, 'he'))
        if (!cancelled) { setRows(r); setLoading(false) }
      } catch (e) {
        if (!cancelled) { toast.show(e instanceof Error ? e.message : 'טעינה נכשלה', 'error'); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.uid])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>
            כל הניחושים {loading ? '' : `· ${rows.length}`}
          </h3>
          <button className="btn" onClick={() => exportCsv(rows)} disabled={loading || rows.length === 0} style={{ padding: '6px 14px', fontSize: 13 }}>
            ⬇ ייצוא CSV
          </button>
        </div>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>
          גיבוי מלא של כל הניחושים. נשמר אוטומטית כל יום ל-GitHub; כאן ניתן לייצא בכל רגע.
        </p>

        {loading && <p className="text-muted" style={{ textAlign: 'center', padding: 16 }}>טוען…</p>}
        {!loading && rows.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: 16 }}>עדיין אין ניחושים.</p>}

        {!loading && rows.length > 0 && (
          <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: 'var(--color-bg-elevated)' }}>
                  {HEADERS.map((h) => (
                    <th key={h} style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 800, borderBottom: '1px solid var(--color-border-strong)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 700 }}>{r.user}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)' }}>{r.email}</td>
                    <td style={{ padding: '7px 10px' }}>{r.dept}</td>
                    <td style={{ padding: '7px 10px' }}>{r.match}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)' }}>{r.kickoff}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 800, textAlign: 'center' }}>{r.pred}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>{r.points}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>{r.auto && '🐙'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
