import { useEffect, useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'

const ANN_TEMPLATES = [
  '⏰ הדדליין לניחושים היום ב-22:00!',
  '🎁 יש פרסים שווים למנצחים!',
  '🤖 רובי האנליסט כבר ניחש — תצליחו לנצח את ה-AI?',
  '🔥 הקרב על המקום הראשון מתחמם!',
  '⚽ המונדיאל יוצא לדרך — בהצלחה לכולם!'
]

export default function AdminContent() {
  const cfg = useAppConfig()
  const toast = useToast()

  const [tagline, setTagline] = useState(cfg.content.tagline)
  const [annText, setAnnText] = useState(cfg.announcement.text)
  const [annActive, setAnnActive] = useState(cfg.announcement.active)
  const [tips, setTips] = useState<string[]>(cfg.tips)
  const [tipsEnabled, setTipsEnabled] = useState(cfg.tipsEnabled)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTagline(cfg.content.tagline)
    setAnnText(cfg.announcement.text)
    setAnnActive(cfg.announcement.active)
    setTips(cfg.tips)
    setTipsEnabled(cfg.tipsEnabled)
  }, [cfg])

  const dirty =
    tagline !== cfg.content.tagline ||
    annText !== cfg.announcement.text ||
    annActive !== cfg.announcement.active ||
    tipsEnabled !== cfg.tipsEnabled ||
    JSON.stringify(tips) !== JSON.stringify(cfg.tips)

  const save = async () => {
    setSaving(true)
    try {
      await patchAppConfig({
        content: { ...cfg.content, tagline }, // prize is hardcoded (coffee machine) in PrizeCard; tournamentName + rules text preserved as-is
        announcement: { text: annText, active: annActive },
        tips: tips.map((t) => t.trim()).filter(Boolean),
        tipsEnabled
      })
      toast.show('נשמר ✓', 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error')
    } finally { setSaving(false) }
  }

  const fld = { width: '100%', padding: '10px 12px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', outline: 'none', color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14 } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Announcement */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>📣 הודעת מערכת (באנר)</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
            <input type="checkbox" checked={annActive} onChange={(e) => setAnnActive(e.target.checked)} />
            מוצג
          </label>
        </div>
        <p className="text-muted" style={{ fontSize: 12 }}>באנר שמופיע לכל המשתמשים בראש האפליקציה.</p>
        <textarea rows={2} value={annText} onChange={(e) => setAnnText(e.target.value)} placeholder="טקסט ההודעה…" style={fld} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ANN_TEMPLATES.map((t) => (
            <button key={t} type="button" onClick={() => { setAnnText(t); setAnnActive(true) }}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 'var(--radius-full)', border: '1px dashed var(--color-border-strong)', background: 'var(--glass-bg-hi)', color: 'var(--color-text)' }}>
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Tip of the day */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>💡 טיפ היום</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
            <input type="checkbox" checked={tipsEnabled} onChange={(e) => setTipsEnabled(e.target.checked)} />
            מוצג
          </label>
        </div>
        <p className="text-muted" style={{ fontSize: 12 }}>
          טיפ מתחלף אוטומטית מדי יום. הוסף טיפים משלך — אם הרשימה ריקה, מוצגים טיפים מובנים כברירת מחדל.
        </p>
        {tips.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 6 }}>
            <input value={t} onChange={(e) => setTips(tips.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`טיפ ${i + 1}`} style={{ ...fld, flex: 1 }} />
            <button onClick={() => setTips(tips.filter((_, j) => j !== i))} style={{ padding: '0 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: 18 }}>×</button>
          </div>
        ))}
        <button onClick={() => setTips([...tips, ''])} className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 12, border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>+ הוספת טיפ</button>
      </section>

      {/* Tagline */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🏷️ כותרת התחברות</h3>
        <Label text="כותרת משנה (מסך התחברות)"><input value={tagline} onChange={(e) => setTagline(e.target.value)} style={fld} /></Label>
        <p className="text-muted" style={{ fontSize: 11 }}>הפרס (מכונת הקפה) מוצג בכרטיס ייעודי במסך הבית — אין צורך לערוך כאן.</p>
      </section>

      <button className="btn btn-block" onClick={save} disabled={!dirty || saving} style={{ padding: '14px' }}>
        {saving ? 'שומר…' : 'שמירת שינויים'}
      </button>
    </div>
  )
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 700 }}>{text}</span>
      {children}
    </label>
  )
}
