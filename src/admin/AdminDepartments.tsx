import { useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { setDepartment } from '../lib/departments'
import { useToast } from '../components/Toast'

export default function AdminDepartments() {
  const cfg = useAppConfig()
  const { entries } = useLeaderboard(200)
  const toast = useToast()
  const [newDept, setNewDept] = useState('')

  const addDept = async () => {
    const d = newDept.trim()
    if (!d || cfg.departments.includes(d)) { setNewDept(''); return }
    await patchAppConfig({ departments: [...cfg.departments, d] })
    setNewDept('')
    toast.show(`"${d}" נוספה`, 'success')
  }
  const removeDept = async (d: string) => {
    await patchAppConfig({ departments: cfg.departments.filter((x) => x !== d) })
    toast.show(`"${d}" הוסרה`, 'info')
  }
  const assign = async (uid: string, dept: string) => {
    try { await setDepartment(uid, dept); toast.show('שויך ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'נכשל', 'error') }
  }

  const inp = { padding: '8px 10px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', outline: 'none' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🏢 מחלקות החברה</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cfg.departments.map((d) => (
            <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 6px 5px 12px', background: 'var(--glass-bg-hi)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 700 }}>
              {d}
              <button onClick={() => removeDept(d)} title="הסר" style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-danger)', color: '#fff', fontSize: 11, display: 'grid', placeItems: 'center' }}>✕</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="הוסף מחלקה…" value={newDept} onChange={(e) => setNewDept(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDept()} />
          <button className="btn" onClick={addDept} disabled={!newDept.trim()} style={{ padding: '0 16px' }}>הוספה</button>
        </div>
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 4 }}>שיוך משתתפים</h3>
        {entries.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>אין עדיין משתתפים.</div>}
        {entries.map((e) => (
          <div key={e.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid var(--glass-border)' }}>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{e.displayName}</span>
            <select value={e.department || ''} onChange={(ev) => assign(e.uid, ev.target.value)} style={inp}>
              <option value="">— ללא —</option>
              {cfg.departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        ))}
      </section>
    </div>
  )
}
