import { useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { useToast } from '../components/Toast'
import type { Timestamp } from 'firebase/firestore'

interface ActivityEvent {
  id: string
  uid: string
  userName: string
  action: string
  context: Record<string, string>
  page?: string
  timestamp: Timestamp | null
}

const ACTION_LABEL: Record<string, string> = {
  login: 'התחברות',
  register: 'הרשמה',
  prediction_save: 'ניחוש משחק',
  bonus_save: 'בונוס',
  survey_submit: 'סקר',
  room_message: 'הודעת חדר',
  profile_name: 'שינוי שם',
  profile_photo: 'תמונת פרופיל',
  department_set: 'הצטרפות למחלקה',
  king_message: 'הודעת מלך',
  admin_delete_user: '🛠️ מחיקת משתמש',
  admin_config_change: '🛠️ שינוי הגדרה',
  admin_unblock_email: '🛠️ ביטול חסימה'
}

const DEMO_EVENTS: ActivityEvent[] = [
  { id: 'd1', uid: 'u1', userName: 'רונן ל.', action: 'prediction_save', context: { matchId: 'm1', score: '2-1' }, timestamp: null },
  { id: 'd2', uid: 'u2', userName: 'יעל ד.', action: 'survey_submit', context: { surveyId: 's1', count: '3' }, timestamp: null },
  { id: 'd3', uid: 'u1', userName: 'רונן ל.', action: 'login', context: { method: 'email' }, timestamp: null },
  { id: 'd4', uid: 'u3', userName: 'שרון ק.', action: 'bonus_save', context: { champion: 'BRA' }, timestamp: null }
]

export default function AdminActivity() {
  const toast = useToast()
  const [events, setEvents] = useState<ActivityEvent[]>(DEMO_MODE ? DEMO_EVENTS : [])
  const [loading, setLoading] = useState(!DEMO_MODE)
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')

  useEffect(() => {
    if (DEMO_MODE) return
    const q = query(collection(db, 'userActivity'), orderBy('timestamp', 'desc'), limit(500))
    return onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityEvent, 'id'>) })))
      setLoading(false)
    }, (err) => { toast.show(err.message, 'error'); setLoading(false) })
  }, [toast])

  const users = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of events) m.set(e.uid, e.userName)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'he'))
  }, [events])

  const actions = useMemo(() => [...new Set(events.map((e) => e.action))].sort(), [events])

  const filtered = useMemo(() => events.filter((e) => {
    if (filterUser && e.uid !== filterUser) return false
    if (filterAction && e.action !== filterAction) return false
    return true
  }), [events, filterUser, filterAction])

  // Per-user summary: last seen + actions today
  const summary = useMemo(() => {
    const map = new Map<string, { name: string; lastSeen: number; today: number }>()
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    for (const e of events) {
      const ts = e.timestamp?.toMillis?.() ?? 0
      const cur = map.get(e.uid) || { name: e.userName, lastSeen: 0, today: 0 }
      if (ts > cur.lastSeen) cur.lastSeen = ts
      if (ts >= startOfDay.getTime()) cur.today++
      map.set(e.uid, cur)
    }
    return [...map.values()].sort((a, b) => b.lastSeen - a.lastSeen)
  }, [events])

  const exportCsv = () => {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
    const HEADERS = ['Time', 'User', 'Action', 'Context', 'Page']
    const lines = [HEADERS.join(',')]
    for (const e of filtered) {
      const t = e.timestamp?.toDate?.().toLocaleString('he-IL') ?? ''
      const ctx = Object.entries(e.context || {}).map(([k, v]) => `${k}=${v}`).join(' ')
      lines.push([t, e.userName, ACTION_LABEL[e.action] || e.action, ctx, e.page || ''].map(esc).join(','))
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>👥 סטטוס משתמשים</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>מי מחובר לאחרונה ומה היקף הפעילות שלו היום.</p>
        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {summary.map((u) => {
            const ago = u.lastSeen ? agoLabel(Date.now() - u.lastSeen) : '—'
            return (
              <div key={u.name} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, padding: '6px 8px', borderBottom: '1px solid var(--color-border)', alignItems: 'center', fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{u.name}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>נראה לאחרונה: {ago}</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{u.today} פעולות היום</span>
              </div>
            )
          })}
          {summary.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>עדיין אין פעילות.</span>}
        </div>
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>📊 יומן פעילות {!loading && `· ${filtered.length}`}</h3>
          <button className="btn" onClick={exportCsv} disabled={filtered.length === 0} style={{ padding: '6px 14px', fontSize: 13 }}>⬇ ייצוא CSV</button>
        </div>
        <p className="text-muted" style={{ fontSize: 12 }}>500 הפעולות האחרונות. סנן לפי משתמש או סוג פעולה. {DEMO_MODE && '(מצב דמו)'}</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} style={selectStyle}>
            <option value="">כל המשתמשים</option>
            {users.map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}
          </select>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={selectStyle}>
            <option value="">כל סוגי הפעולה</option>
            {actions.map((a) => <option key={a} value={a}>{ACTION_LABEL[a] || a}</option>)}
          </select>
        </div>

        {loading && <p className="text-muted" style={{ textAlign: 'center', padding: 16 }}>טוען…</p>}
        {!loading && filtered.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: 16 }}>אין פעולות תואמות.</p>}
        {!loading && filtered.length > 0 && (
          <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: 'var(--color-bg-elevated)' }}>
                  <th style={th}>זמן</th>
                  <th style={th}>משתמש</th>
                  <th style={th}>פעולה</th>
                  <th style={th}>פרטים</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const t = e.timestamp?.toDate?.()
                  const ctx = Object.entries(e.context || {}).map(([k, v]) => `${k}=${v}`).join(' · ')
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={td}>{t ? t.toLocaleString('he-IL') : '—'}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{e.userName}</td>
                      <td style={td}>{ACTION_LABEL[e.action] || e.action}</td>
                      <td style={{ ...td, color: 'var(--color-text-muted)' }}>{ctx}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function agoLabel(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return 'עכשיו'
  const m = Math.floor(s / 60); if (m < 60) return `${m} דק׳`
  const h = Math.floor(m / 60); if (h < 24) return `${h} שע׳`
  return `${Math.floor(h / 24)} ימים`
}

const selectStyle = { padding: '8px 10px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: 13 } as const
const th = { textAlign: 'right', padding: '8px 10px', fontWeight: 800, borderBottom: '1px solid var(--color-border-strong)' } as const
const td = { padding: '7px 10px' } as const
