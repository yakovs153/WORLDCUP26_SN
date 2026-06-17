import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { useAuth } from '../auth/AuthProvider'
import { getDemoMatches, getDemoPredictions, getDemoUser, getDemoBonus } from '../lib/demoData'
import { useToast } from '../components/Toast'
import { heName } from '../lib/teamNames'
import type { BonusPrediction, Match, Prediction, UserDoc } from '../types'

interface Row {
  user: string; email: string; dept: string; match: string
  kickoff: string; pred: string; points: string; auto: string
  submitted: string  // when the prediction was written
  suspect: boolean   // auto-flagged BUT saved before kickoff => a real bet wrongly marked auto
}

interface BonusRow {
  user: string; email: string; dept: string
  champion: string; runnerUp: string; surprise: string; flop: string; topScorer: string
  awardedPoints: string
}

const HEADERS = ['שם', 'אימייל', 'מחלקה', 'משחק', 'מועד', 'ניחוש', 'נקודות', 'אוטומטי', 'מועד שמירה']
const BONUS_HEADERS = ['שם', 'אימייל', 'מחלקה', 'זוכה', 'סגנית', 'הפתעה', 'אכזבה', 'מלך שערים', 'נק׳ בונוס']

function toRow(p: Prediction & { submittedAt?: { toMillis?: () => number; toDate?: () => Date } }, m: Match | undefined, u: UserDoc | undefined): Row {
  const subMs = p.submittedAt?.toMillis?.() ?? null
  const kickMs = m?.kickoff?.toMillis?.() ?? null
  // A genuine bet is written by the client BEFORE kickoff; the auto-fill writes
  // AT/AFTER kickoff. So auto + submitted-before-kickoff = a real bet wrongly
  // flagged auto (worth a closer look / fix).
  const suspect = !!p.auto && subMs != null && kickMs != null && subMs < kickMs
  return {
    user: u?.displayName ?? p.uid,
    email: u?.email ?? '',
    dept: u?.department ?? '',
    match: m ? `${heName(m.homeTeam.code, m.homeTeam.name)} - ${heName(m.awayTeam.code, m.awayTeam.name)}` : p.matchId,
    kickoff: m ? m.kickoff.toDate().toLocaleString('he-IL') : '',
    pred: `${p.homeScore}-${p.awayScore}`,
    points: p.points == null ? '' : String(p.points),
    auto: p.auto ? 'כן' : '',
    submitted: subMs != null ? new Date(subMs).toLocaleString('he-IL') : '',
    suspect
  }
}

function toBonusRow(b: BonusPrediction & { awardedPoints?: number }, u: UserDoc | undefined, teamCodeToName: Map<string, string>): BonusRow {
  const team = (code: string | null | undefined) => (code ? (teamCodeToName.get(code) || code) : '—')
  return {
    user: u?.displayName ?? b.uid,
    email: u?.email ?? '',
    dept: u?.department ?? '',
    champion:  team(b.championTeamCode),
    runnerUp:  team(b.runnerUpCode),
    surprise:  team(b.surpriseTeamCode),
    flop:      team(b.flopTeamCode),
    topScorer: b.topScorer || '—',
    awardedPoints: b.awardedPoints == null ? '' : String(b.awardedPoints)
  }
}

function exportCsv(rows: Row[]) {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
  const lines = [
    HEADERS.join(','),
    ...rows.map((r) => [r.user, r.email, r.dept, r.match, r.kickoff, r.pred, r.points, r.auto, r.submitted].map(esc).join(','))
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

function exportBonusCsv(rows: BonusRow[]) {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
  const lines = [
    BONUS_HEADERS.join(','),
    ...rows.map((r) => [r.user, r.email, r.dept, r.champion, r.runnerUp, r.surprise, r.flop, r.topScorer, r.awardedPoints].map(esc).join(','))
  ]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bonus-predictions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminPredictions() {
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [bonusRows, setBonusRows] = useState<BonusRow[]>([])
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
          // Demo bonus — just the current user's, if any.
          const teamCodeToName = new Map<string, string>()
          for (const m of getDemoMatches()) {
            if (m.homeTeam?.code) teamCodeToName.set(m.homeTeam.code, heName(m.homeTeam.code, m.homeTeam.name))
            if (m.awayTeam?.code) teamCodeToName.set(m.awayTeam.code, heName(m.awayTeam.code, m.awayTeam.name))
          }
          const demoBonus = getDemoBonus(user?.uid ?? 'demo')
          const br: BonusRow[] = demoBonus
            ? [toBonusRow(demoBonus as BonusPrediction, u, teamCodeToName)]
            : []
          if (!cancelled) { setRows(r); setBonusRows(br); setLoading(false) }
          return
        }
        const [pSnap, uSnap, mSnap, bSnap] = await Promise.all([
          getDocs(collection(db, 'predictions')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'matches')),
          getDocs(collection(db, 'bonusPredictions'))
        ])
        const users = new Map(uSnap.docs.map((d) => [d.id, d.data() as UserDoc]))
        const matches = new Map(mSnap.docs.map((d) => [d.id, d.data() as Match]))
        // Build a code → Hebrew team-name map from matches metadata.
        const teamCodeToName = new Map<string, string>()
        for (const m of matches.values()) {
          if (m.homeTeam?.code) teamCodeToName.set(m.homeTeam.code, heName(m.homeTeam.code, m.homeTeam.name))
          if (m.awayTeam?.code) teamCodeToName.set(m.awayTeam.code, heName(m.awayTeam.code, m.awayTeam.name))
        }
        const r = pSnap.docs
          .map((d) => d.data() as Prediction)
          .map((p) => toRow(p, matches.get(p.matchId), users.get(p.uid)))
          // Surface suspect rows (auto-flagged but saved before kickoff) at the top.
          .sort((a, b) => (b.suspect ? 1 : 0) - (a.suspect ? 1 : 0) || a.user.localeCompare(b.user, 'he'))
        const br = bSnap.docs
          .map((d) => d.data() as BonusPrediction & { awardedPoints?: number })
          .map((b) => toBonusRow(b, users.get(b.uid), teamCodeToName))
          .sort((a, b) => a.user.localeCompare(b.user, 'he'))
        if (!cancelled) { setRows(r); setBonusRows(br); setLoading(false) }
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
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: r.suspect ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : undefined }}>
                    <td style={{ padding: '7px 10px', fontWeight: 700 }}>{r.user}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)' }}>{r.email}</td>
                    <td style={{ padding: '7px 10px' }}>{r.dept}</td>
                    <td style={{ padding: '7px 10px' }}>{r.match}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)' }}>{r.kickoff}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 800, textAlign: 'center' }}>{r.pred}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>{r.points}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>{r.auto && '🎲'}{r.suspect && <span title="ניחש לפני המשחק אך סומן אוטומטי — כנראה הימור אמיתי">⚠️</span>}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)' }}>{r.submitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bonus predictions — separate section, separate CSV. */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>
            🏆 ניחושי בונוס {loading ? '' : `· ${bonusRows.length}`}
          </h3>
          <button className="btn" onClick={() => exportBonusCsv(bonusRows)} disabled={loading || bonusRows.length === 0} style={{ padding: '6px 14px', fontSize: 13 }}>
            ⬇ ייצוא CSV
          </button>
        </div>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>
          ניחושי הזוכה, סגנית, הפתעה, אכזבה ומלך השערים — אחד לכל משתמש. גם נשמר בגיבוי היומי.
        </p>

        {!loading && bonusRows.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: 16 }}>עדיין אין ניחושי בונוס.</p>}

        {!loading && bonusRows.length > 0 && (
          <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: 'var(--color-bg-elevated)' }}>
                  {BONUS_HEADERS.map((h) => (
                    <th key={h} style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 800, borderBottom: '1px solid var(--color-border-strong)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bonusRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 700 }}>{r.user}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--color-text-muted)' }}>{r.email}</td>
                    <td style={{ padding: '7px 10px' }}>{r.dept}</td>
                    <td style={{ padding: '7px 10px' }}>{r.champion}</td>
                    <td style={{ padding: '7px 10px' }}>{r.runnerUp}</td>
                    <td style={{ padding: '7px 10px' }}>{r.surprise}</td>
                    <td style={{ padding: '7px 10px' }}>{r.flop}</td>
                    <td style={{ padding: '7px 10px' }}>{r.topScorer}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 800, color: 'var(--color-primary)' }}>{r.awardedPoints}</td>
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
