import { useState } from 'react'

const KEY = 'wc26-onboarded-v1'
const SLIDES = [
  { emoji: '⚽', title: 'נחשו כל משחק', text: 'הזינו תוצאה לכל משחק וצברו נקודות לפי הדיוק — תוצאה מדויקת שווה הכי הרבה.' },
  { emoji: '🏆', title: 'בונוסים גדולים', text: 'בחרו זוכה, סגנית, מלך שערים, הפתעה ואכזבה — נקודות בונוס ענקיות.' },
  { emoji: '🤖', title: 'טום האנליסט', text: 'שכחתם לנחש? טום ה-AI ינחש בשבילכם (על 70% מהנקודות בלבד). תנצחו את ה-AI?' }
]

/** First-login 3-slide intro. Shows once (localStorage), skippable. */
export default function Onboarding() {
  const [done, setDone] = useState(() => { try { return !!localStorage.getItem(KEY) } catch { return true } })
  const [i, setI] = useState(0)
  if (done) return null
  const finish = () => { try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } setDone(true) }
  const s = SLIDES[i]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card animate-in" style={{ maxWidth: 360, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14, padding: '28px 22px' }}>
        <div style={{ fontSize: 54 }}>{s.emoji}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{s.title}</h2>
        <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{s.text}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {SLIDES.map((_, n) => <span key={n} style={{ width: 8, height: 8, borderRadius: '50%', background: n === i ? 'var(--color-primary)' : 'var(--color-border-strong)' }} />)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={finish} className="btn-ghost" style={{ flex: 1, padding: '10px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>דלג</button>
          <button onClick={() => (i < SLIDES.length - 1 ? setI(i + 1) : finish())} className="btn" style={{ flex: 1 }}>{i < SLIDES.length - 1 ? 'הבא' : 'יאללה!'}</button>
        </div>
      </div>
    </div>
  )
}
