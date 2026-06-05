import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { useAuth } from '../auth/AuthProvider'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'

const TOGGLES: { key: 'pundit' | 'leaderPerk' | 'analystAutofill'; label: string; desc: string }[] = [
  { key: 'pundit', label: '🤖 מבזק טום האנליסט', desc: 'כרטיס ה-AI היומי במסך הבית' },
  { key: 'leaderPerk', label: '👑 הטבת המוביל', desc: 'באנר המלך + רמקול להודעה לכולם' },
  { key: 'analystAutofill', label: '🧠 מילוי אוטומטי ע״י טום', desc: 'מי ששכח לנחש מקבל את ניחוש ה-AI (70% מהנקודות)' }
]

export default function AdminFeatures() {
  const { user } = useAuth()
  const cfg = useAppConfig()
  const toast = useToast()

  const [flags, setFlags] = useState(cfg.features)
  const [tipsEnabled, setTipsEnabled] = useState(cfg.tipsEnabled)
  const [savingFlags, setSavingFlags] = useState(false)
  const [pundit, setPundit] = useState('')
  const [savingPundit, setSavingPundit] = useState(false)

  useEffect(() => { setFlags(cfg.features); setTipsEnabled(cfg.tipsEnabled) }, [cfg])
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

      {/* Override Tom's daily recap */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🤖 מבזק טום (עקיפה ידנית)</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>הטקסט שמוצג כרגע במסך הבית. טום מעדכן אותו אוטומטית כל בוקר; כאן אפשר לערוך או לנקות ידנית.</p>
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
    </div>
  )
}
