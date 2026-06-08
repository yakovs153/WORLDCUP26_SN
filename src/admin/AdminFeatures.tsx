import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { useAuth } from '../auth/AuthProvider'
import { useAppConfig } from '../hooks/useAppConfig'
import { useMatches } from '../hooks/useMatches'
import { patchAppConfig } from '../lib/appConfig'
import { tomPick } from '../lib/octopus'
import { useToast } from '../components/Toast'

const TOGGLES: { key: 'pundit' | 'leaderPerk' | 'analystAutofill' | 'requireEmailVerification'; label: string; desc: string }[] = [
  { key: 'pundit', label: '🤖 מבזק רובי האנליסט', desc: 'כרטיס ה-AI היומי במסך הבית' },
  { key: 'leaderPerk', label: '👑 הטבת המוביל', desc: 'באנר המלך + רמקול להודעה לכולם' },
  { key: 'analystAutofill', label: '🧠 מילוי אוטומטי ע״י רובי', desc: 'מי ששכח לנחש מקבל את ניחוש ה-AI (50% מהנקודות)' },
  { key: 'requireEmailVerification', label: '📧 חובת אימות מייל בהרשמה', desc: 'חוסם גישה עד שהמשתמש לוחץ על קישור האימות במייל שנשלח אליו' }
]

export default function AdminFeatures() {
  const { user } = useAuth()
  const cfg = useAppConfig()
  const toast = useToast()

  const { matches } = useMatches()
  const [flags, setFlags] = useState(cfg.features)
  const [tipsEnabled, setTipsEnabled] = useState(cfg.tipsEnabled)
  const [savingFlags, setSavingFlags] = useState(false)
  const [pundit, setPundit] = useState('')
  const [savingPundit, setSavingPundit] = useState(false)
  const [ov, setOv] = useState<Record<string, [number, number]>>(cfg.analystOverrides)
  const [savingOv, setSavingOv] = useState(false)

  useEffect(() => { setFlags(cfg.features); setTipsEnabled(cfg.tipsEnabled); setOv(cfg.analystOverrides) }, [cfg])

  const scheduled = matches.filter((m) => m.status === 'SCHEDULED').slice(0, 60)
  const ovDirty = JSON.stringify(ov) !== JSON.stringify(cfg.analystOverrides)
  const setPick = (id: string, idx: 0 | 1, val: string) => {
    const n = Math.max(0, Math.min(20, parseInt(val || '0', 10)))
    setOv((p) => { const cur = p[id] || [0, 0]; const next: [number, number] = idx === 0 ? [n, cur[1]] : [cur[0], n]; return { ...p, [id]: next } })
  }
  const clearPick = (id: string) => setOv((p) => { const { [id]: _drop, ...rest } = p; return rest })
  const saveOv = async () => {
    setSavingOv(true)
    try { await patchAppConfig({ analystOverrides: ov }); toast.show('עקיפות רובי נשמרו ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error') }
    finally { setSavingOv(false) }
  }
  useEffect(() => {
    if (DEMO_MODE) return
    return onSnapshot(doc(db, 'appState', 'pundit'), (s) => setPundit((s.data()?.text as string) || ''))
  }, [])

  const flagsDirty = JSON.stringify(flags) !== JSON.stringify(cfg.features) || tipsEnabled !== cfg.tipsEnabled

  const saveFlags = async () => {
    setSavingFlags(true)
    try { await patchAppConfig({ features: flags, tipsEnabled }); toast.show('נשמר ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error') }
    finally { setSavingFlags(false) }
  }

  const savePundit = async () => {
    if (DEMO_MODE) { toast.show('עריכת מבזק זמינה בפרודקשן', 'info'); return }
    setSavingPundit(true)
    try { await setDoc(doc(db, 'appState', 'pundit'), { text: pundit.trim(), updatedAt: serverTimestamp() }); toast.show('המבזק עודכן ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error') }
    finally { setSavingPundit(false) }
  }

  const clearKingMsg = async () => {
    if (DEMO_MODE || !user) { toast.show('זמין בפרודקשן', 'info'); return }
    try { await setDoc(doc(db, 'appState', 'kingMessage'), { message: '', byUid: user.uid }); toast.show('הודעת המלך נוקתה ✓', 'success') }
    catch (e) { toast.show(e instanceof Error ? e.message : 'נכשל', 'error') }
  }

  const fld = { width: '100%', padding: '10px 12px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', outline: 'none', color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14 } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Toggles */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>⚙️ הפעלה / כיבוי תכונות</h3>
        {TOGGLES.map((t) => (
          <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
            <input type="checkbox" checked={flags[t.key]} onChange={(e) => setFlags({ ...flags, [t.key]: e.target.checked })} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{t.desc}</div>
            </div>
          </label>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
          <input type="checkbox" checked={tipsEnabled} onChange={(e) => setTipsEnabled(e.target.checked)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>💡 טיפ היום</div>
            <div className="text-muted" style={{ fontSize: 12 }}>כרטיס הטיפ המתחלף במסך הבית</div>
          </div>
        </label>
        <button className="btn" onClick={saveFlags} disabled={!flagsDirty || savingFlags} style={{ marginTop: 4 }}>
          {savingFlags ? 'שומר…' : 'שמירת תכונות'}
        </button>
      </section>

      {/* Trigger Tom's daily run on demand (real Gemini call) */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>✨ הרץ את רובי עכשיו</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>
          רוצה לראות את שולחן הפרשנים, האימון האישי וההצעות לסקרים מבלי לחכות לבוקר? פתח את ה-Action ולחץ "Run workflow".
        </p>
        <a href="https://github.com/yakovs153/WORLDCUP26_SN/actions/workflows/pundit.yml" target="_blank" rel="noopener noreferrer"
          className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: 13, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', textDecoration: 'none' }}>
          פתח את ה-Action ↗
        </a>
      </section>

      {/* Override Tom's daily recap */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🤖 מבזק רובי (עקיפה ידנית)</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>הטקסט שמוצג כרגע במסך הבית. רובי מעדכן אותו אוטומטית כל בוקר; כאן אפשר לערוך או לנקות ידנית.</p>
        <textarea rows={4} value={pundit} onChange={(e) => setPundit(e.target.value)} placeholder={DEMO_MODE ? '(זמין בפרודקשן)' : 'טקסט המבזק…'} style={fld} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={savePundit} disabled={savingPundit} style={{ flex: 1 }}>{savingPundit ? 'שומר…' : 'עדכון מבזק'}</button>
          <button onClick={() => setPundit('')} className="btn-ghost" style={{ padding: '10px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>נקה</button>
        </div>
      </section>

      {/* King message moderation */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>👑 הודעת המלך</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>המוביל בדירוג יכול לפרסם הודעה לכולם. אם צריך — אפשר לנקות אותה כאן.</p>
        <button onClick={clearKingMsg} className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: 13, color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)' }}>
          נקה את הודעת המלך
        </button>
      </section>

      {/* Tom's pick override (ahead of kickoff) */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🤖 עקיפת ניחושי רובי</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>רובי מנחש את הפייבוריט אוטומטית. כאן אפשר לעקוף ידנית ניחוש למשחק מסוים (לפני פתיחתו). ריק = ניחוש אוטומטי.</p>
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {scheduled.map((m) => {
            const [ah, aa] = tomPick(m.homeTeam.code, m.awayTeam.code, m.id)
            const cur = ov[m.id]
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 0', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.homeTeam.name} - {m.awayTeam.name}</span>
                <span style={{ color: 'var(--color-text-muted)' }} title="ניחוש אוטומטי">auto {ah}-{aa}</span>
                <input type="number" min={0} max={20} value={cur ? cur[0] : ''} placeholder={String(ah)} onChange={(e) => setPick(m.id, 0, e.target.value)} style={ovInput} />
                <span>-</span>
                <input type="number" min={0} max={20} value={cur ? cur[1] : ''} placeholder={String(aa)} onChange={(e) => setPick(m.id, 1, e.target.value)} style={ovInput} />
                {cur && <button onClick={() => clearPick(m.id)} title="בטל עקיפה" style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}>×</button>}
              </div>
            )
          })}
          {scheduled.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>אין משחקים עתידיים.</span>}
        </div>
        <button className="btn" onClick={saveOv} disabled={!ovDirty || savingOv} style={{ alignSelf: 'flex-start', padding: '8px 16px' }}>
          {savingOv ? 'שומר…' : 'שמירת עקיפות'}
        </button>
      </section>
    </div>
  )
}

const ovInput = { width: 40, textAlign: 'center', padding: '4px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: 13 } as const
