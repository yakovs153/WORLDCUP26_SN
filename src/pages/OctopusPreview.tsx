import { useState } from 'react'
import { Link } from 'react-router-dom'
import OctopusMark, { OCTOPUS_IMG } from '../components/OctopusMark'

function OctoHero() {
  const [broken, setBroken] = useState(false)
  if (broken) return null
  return (
    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#eef6fb', border: '1px solid var(--glass-border)' }}>
      <img src={OCTOPUS_IMG} alt="האנליסט" onError={() => setBroken(true)} style={{ display: 'block', width: '100%', height: 'auto' }} />
    </div>
  )
}

/**
 * MOCKUP / preview of the Octopus oracle feature — for sign-off before wiring
 * the real logic. Static data only. Public route: /octopus.
 */

// Deterministic "random but plausible" scoreline from a seed (matchId).
// Range 0–3 per side, total ≤ 5 → e.g. 2-1, 3-0, 1-1, never 6-6 or 9-1.
function octoPredict(seed: string): [number, number] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  let home = h % 4
  let away = Math.floor(h / 4) % 4
  while (home + away > 5) { if (home >= away) home--; else away-- }
  return [home, away]
}

const SAMPLE = [
  { id: 'm1', home: 'ברזיל', hf: '🇧🇷', away: 'קרואטיה', af: '🇭🇷' },
  { id: 'm9', home: 'ארגנטינה', hf: '🇦🇷', away: 'מקסיקו', af: '🇲🇽' },
  { id: 'm3', home: 'אנגליה', hf: '🏴', away: 'הולנד', af: '🇳🇱' },
  { id: 'm7', home: 'ספרד', hf: '🇪🇸', away: 'גרמניה', af: '🇩🇪' },
  { id: 'm5', home: 'צרפת', hf: '🇫🇷', away: 'פורטוגל', af: '🇵🇹' }
]

const LEADER = [
  { rank: 1, name: 'רונן ל.', pts: 47, dept: 'שיווק' },
  { rank: 2, name: 'טום האנליסט 🤖', pts: 44, dept: 'אנליסט AI', octo: true },
  { rank: 3, name: 'שרון ק.', pts: 41, dept: 'פיתוח' },
  { rank: 4, name: 'אני', pts: 38, dept: 'דאטה', me: true }
]

export default function OctopusPreview() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" className="btn-ghost" style={{ padding: '6px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13, textDecoration: 'none', color: 'inherit' }}>← חזרה</Link>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent)', letterSpacing: 1 }}>תצוגה מקדימה · לא סופי</span>
        </div>

        <OctoHero />

        {/* Hero */}
        <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 20%, var(--color-bg-elevated)), var(--color-bg-elevated))' }}>
          <OctopusMark size={84} />
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 26 }}>טום האנליסט 🤖</h1>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>האנליסט מבוסס-ה-AI של StoreNext — מנתח ומנחש כל משחק, ומחליף אותך אם שכחת.</p>
          </div>
        </section>

        {/* How it works */}
        <section className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 10 }}>איך זה עובד</h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, listStyle: 'none', padding: 0 }}>
            <li>🎲 <b>ניחוש לכל משחק</b> — תוצאה אקראית אך הגיונית (למשל 2-1, 3-0, 1-1), זהה לכל מי שלא ניחש.</li>
            <li>😴 <b>שכחת לנחש?</b> האנליסט ממלא בשבילך אוטומטית ברגע שהמשחק נעול.</li>
            <li>🎯 <b>50% מהנקודות</b> — אם שכחת, ניחוש של טום שווה 50% מניחוש שלך.</li>
            <li>🏆 <b>משתתף בדירוג</b> — האנליסט הוא שחקן לכל דבר. תצליח לנצח אותו?</li>
          </ul>
        </section>

        {/* Leaderboard mock */}
        <section className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 10 }}>בלוח הדירוג</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {LEADER.map((r) => (
              <div key={r.rank} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 'var(--radius-md)',
                background: r.octo ? 'color-mix(in srgb, var(--color-primary) 14%, transparent)' : r.me ? 'var(--glass-bg-hi)' : 'var(--color-bg-elevated)',
                border: r.octo ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'
              }}>
                <span style={{ width: 22, textAlign: 'center', fontWeight: 800, color: 'var(--color-text-muted)' }}>{r.rank}</span>
                {r.octo
                  ? <OctopusMark size={34} />
                  : <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--glass-bg-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{r.name[0]}</span>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.dept}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18 }}>{r.pts}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)', fontSize: 13, fontWeight: 700 }}>
            😜 אתה 6 נקודות מאחורי האנליסט. באמת תיתן ל-🤖 לנצח אותך?
          </div>
        </section>

        {/* Auto-fill badge on a match card */}
        <section className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 10 }}>כששכחת לנחש</h2>
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, padding: '14px 16px' }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 30 }}>🇧🇷</div><div style={{ fontWeight: 800, fontSize: 13 }}>ברזיל</div></div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26 }}>2 : 1</div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 30 }}>🇭🇷</div><div style={{ fontWeight: 800, fontSize: 13 }}>קרואטיה</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)', borderTop: '1px solid var(--glass-border)', fontSize: 13, fontWeight: 700 }}>
              <OctopusMark size={26} /> סטורי האנליסט ניחש בשבילך
            </div>
          </div>
        </section>

        {/* Octopus picks for today */}
        <section className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 10 }}>תחזיות האנליסט להיום</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SAMPLE.map((m) => {
              const [h, a] = octoPredict(m.id)
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 14 }}>{m.hf} {m.home}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16 }}>{h} : {a}</span>
                  <span style={{ fontSize: 14 }}>{m.away} {m.af}</span>
                </div>
              )
            })}
          </div>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 10 }}>
            התוצאות מיוצרות אקראית אך תמיד הגיוניות: 0–3 לכל צד, סה״כ עד 5 שערים. אין 6-6 או 9-1.
          </p>
        </section>

        {/* Chosen name */}
        <section className="card" style={{ textAlign: 'center' }}>
          <div className="text-muted" style={{ fontSize: 12, fontWeight: 700 }}>השם נבחר</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginTop: 4 }}>טום האנליסט 🤖</div>
        </section>

      </div>
    </div>
  )
}
