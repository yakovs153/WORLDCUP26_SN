import { useEffect, useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'

const ANN_TEMPLATES = [
  '⏰ הדדליין לניחושים היום ב-22:00!',
  '🎁 יש פרסים שווים למנצחים!',
  '🐙 סטורי התמנון כבר ניחש — תצליחו לנצח אותו?',
  '🔥 הקרב על המקום הראשון מתחמם!',
  '⚽ המונדיאל יוצא לדרך — בהצלחה לכולם!'
]

export default function AdminContent() {
  const cfg = useAppConfig()
  const toast = useToast()

  const [tournamentName, setTournamentName] = useState(cfg.content.tournamentName)
  const [tagline, setTagline] = useState(cfg.content.tagline)
  const [rulesIntro, setRulesIntro] = useState(cfg.content.rulesIntro)
  const [rulesNotes, setRulesNotes] = useState(cfg.content.rulesNotes)
  const [prize, setPrize] = useState(cfg.content.prize)
  const [annText, setAnnText] = useState(cfg.announcement.text)
  const [annActive, setAnnActive] = useState(cfg.announcement.active)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTournamentName(cfg.content.tournamentName)
    setTagline(cfg.content.tagline)
    setRulesIntro(cfg.content.rulesIntro)
    setRulesNotes(cfg.content.rulesNotes)
    setPrize(cfg.content.prize)
    setAnnText(cfg.announcement.text)
    setAnnActive(cfg.announcement.active)
  }, [cfg])

  const dirty =
    tournamentName !== cfg.content.tournamentName ||
    tagline !== cfg.content.tagline ||
    rulesIntro !== cfg.content.rulesIntro ||
    rulesNotes !== cfg.content.rulesNotes ||
    prize !== cfg.content.prize ||
    annText !== cfg.announcement.text ||
    annActive !== cfg.announcement.active

  const save = async () => {
    setSaving(true)
    try {
      await patchAppConfig({
        content: { tournamentName: tournamentName.trim() || 'מונדיאל 2026', tagline, rulesIntro, rulesNotes, prize },
        announcement: { text: annText, active: annActive }
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
        <p className="text-muted" style={{ fontSize: 12 }}>באנר שמופיע לכל המשתמשים בראש האפליקציה. למשל: «הדדליין הערב 22:00!» או «יש פרסים 🎁».</p>
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

      {/* Branding */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🏷️ שם וכותרת</h3>
        <Label text="שם הטורניר (כותרת עליונה)"><input value={tournamentName} onChange={(e) => setTournamentName(e.target.value)} style={fld} /></Label>
        <Label text="כותרת משנה (מסך התחברות)"><input value={tagline} onChange={(e) => setTagline(e.target.value)} style={fld} /></Label>
        <Label text="🎁 פרס (מוצג בעמוד הבית)"><input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="למשל: ארוחת שף לזוכה + גביע נודד" style={fld} /></Label>
      </section>

      {/* Rules text */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>📖 טקסט בעמוד התקנון</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>טבלת הניקוד ושלבי הטורניר מתעדכנים אוטומטית מההגדרות. כאן אפשר להוסיף פסקת פתיחה והערות חופשיות.</p>
        <Label text="פסקת פתיחה (למעלה)"><textarea rows={3} value={rulesIntro} onChange={(e) => setRulesIntro(e.target.value)} placeholder="ברוכים הבאים לתחרות…" style={fld} /></Label>
        <Label text="הערות נוספות (למטה)"><textarea rows={4} value={rulesNotes} onChange={(e) => setRulesNotes(e.target.value)} placeholder="פרסים, לוחות זמנים, צור קשר…" style={fld} /></Label>
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
