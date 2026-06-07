import { Link } from 'react-router-dom'
import { useAppConfig } from '../hooks/useAppConfig'
import type { MatchStage } from '../types'

const STAGES: { key: MatchStage; label: string }[] = [
  { key: 'GROUP', label: 'שלב הבתים' },
  { key: 'R32',   label: 'סיבוב 32 (1/32)' },
  { key: 'R16',   label: 'שמינית הגמר (1/16)' },
  { key: 'QF',    label: 'רבע הגמר (1/8)' },
  { key: 'SF',    label: 'חצי הגמר (1/4)' },
  { key: 'TP',    label: 'המקום השלישי' },
  { key: 'F',     label: 'הגמר 🏆' }
]

export default function Rules() {
  const cfg = useAppConfig()
  const b = cfg.bonus
  return (
    <div
      className="page-fade"
      style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        minHeight: '100vh'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <Link to="/" className="btn-ghost"
          style={{ padding: '6px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
          ← חזרה
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 28 }}>תקנון הניקוד</h1>
      </div>

      {cfg.content.rulesIntro && (
        <div className="card" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14 }}>
          {cfg.content.rulesIntro}
        </div>
      )}

      {/* Per-stage scoring */}
      <Section title="ניקוד משחקים — לפי שלב" icon="⚽">
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, lineHeight: 1.7 }}>
          לכל משחק שתי דרכים לזכות בנקודות:
          <br />
          🎯 <strong>תוצאה מדויקת</strong> — ניחשת את התוצאה הסופית בדיוק (למשל ניחשת 2-1 — היה 2-1).
          <br />
          ✅ <strong>כיוון נכון</strong> — ניחשת מי תנצח (או תיקו), אך לא את התוצאה המדויקת.
          <br />
          ❌ <strong>ניחוש שגוי</strong> = 0 נקודות.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 6, padding: '8px 4px', borderTop: '1px solid var(--color-border)', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 800 }}>שלב</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 800, textAlign: 'center' }}>כיוון</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 800, textAlign: 'center' }}>מדויק</span>
        </div>
        {STAGES.map((s) => {
          const v = cfg.scoring[s.key] ?? { direction: 0, exact: 0 }
          return (
            <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 6, padding: '10px 4px', borderTop: '1px solid var(--color-border)', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, textAlign: 'center', color: 'var(--color-text)' }}>{v.direction}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, textAlign: 'center', color: 'var(--color-primary)' }}>{v.exact}</span>
            </div>
          )
        })}
      </Section>

      {/* Bonus scoring */}
      <Section title="ניחושי בונוס" icon="🏆">
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          ניחושים מיוחדים שיש להגיש <strong style={{ color: 'var(--color-text)' }}>לפני תחילת הטורניר</strong>.
          ניתן לעדכן עד פתיחת המשחק הראשון, ולאחר מכן הם ננעלים סופית.
        </p>
        <BonusRow icon="🏆" label="זוכה המונדיאל" example="הנבחרת שתזכה בגביע" points={b.champion} highlight />
        <BonusRow icon="⚽" label="מלך השערים"     example="הכובש המוביל בכל הטורניר" points={b.topScorer} highlight />
        <BonusRow icon="🥈" label="הסגנית"          example="הנבחרת שתפסיד בגמר" points={b.runnerUp} />
        <BonusRow icon="🐎" label="הפתעת הטורניר"  example="אאוטסיידרית שתגיע לפחות לרבע הגמר" points={b.surprise} />
        <BonusRow icon="📉" label="האכזבה הגדולה"  example="אחת מהפייבוריטיות שתודח מוקדם" points={b.flop} />
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
          <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>סה״כ בונוס מקסימלי: {b.champion + b.topScorer + b.runnerUp + b.surprise + b.flop} נקודות</span>
        </div>
      </Section>

      {/* Important rules */}
      <Section title="חוקים חשובים" icon="📌">
        <Bullet>ניתן לעדכן ניחוש <strong>עד 5 דקות לפני</strong> שריקת הפתיחה של המשחק.</Bullet>
        <Bullet>5 דקות לפני המשחק הניחוש <strong>ננעל</strong> ולא ניתן לשינוי.</Bullet>
        <Bullet>
          <strong>תוצאה לחישוב נקודות:</strong> בשלב הבתים — תוצאת 90 הדקות.
          בשלבי הנוקאאוט — התוצאה לאחר ההארכה (עד 120 דקות), <strong>ללא דו-קרב פנדלים</strong>.
        </Bullet>
        <Bullet>
          <strong>שוויון בהימורי בונוס</strong> (מלך השערים, הפתעת הטורניר, האכזבה) — כל הניחושים הזוכים יקבלו את מלוא הנקודות.
        </Bullet>
        <Bullet>ניחושי הבונוס נשמרים עד פתיחת המשחק הראשון בטורניר ואינם ניתנים לשינוי לאחר מכן.</Bullet>
        <Bullet>תוצאות מתעדכנות אוטומטית — אין צורך לרענן.</Bullet>
        <Bullet>הניקוד מחושב מיד בסיום המשחק; הנקודות מתעדכנות אוטומטית בפרופיל ובדירוג.</Bullet>
        <Bullet>שכחת לנחש? 🤖 טום האנליסט (ה-AI שלנו) ינחש עבורך אוטומטית עם פתיחת המשחק — אבל תקבל רק <strong>50%</strong> מהנקודות על ניחוש כזה. אז עדיף תמיד לנחש בעצמך!</Bullet>
      </Section>

      {/* Tournament stages */}
      <Section title="שלבי הטורניר" icon="🗺️">
        <StagePill name="שלב הבתים"        detail="12 בתים (A–L) · 3 משחקים לכל קבוצה · 72 משחקים" />
        <StagePill name="סיבוב 32 (1/32)"   detail="32 הקבוצות הטובות מעפילות (32 → 16)" />
        <StagePill name="שמינית הגמר (1/16)" detail="16 קבוצות → 8" />
        <StagePill name="רבע הגמר (1/8)"    detail="8 → 4" />
        <StagePill name="חצי הגמר (1/4)"    detail="4 → 2" />
        <StagePill name="המקום השלישי"     detail="המפסידות בחצי הגמר" />
        <StagePill name="הגמר 🏆"           detail="המשחק על הגביע" />
      </Section>

      {cfg.content.rulesNotes && (
        <Section title="הערות נוספות" icon="📝">
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14 }}>{cfg.content.rulesNotes}</div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="card animate-in" style={{ padding: 'var(--space-4)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 20, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden style={{ fontSize: 22 }}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function BonusRow({ icon, label, example, points, highlight }: { icon: string; label: string; example: string; points: number; highlight?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: '12px 4px', borderTop: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 22, width: 40, height: 40, display: 'grid', placeItems: 'center', background: 'var(--color-bg-elevated)', borderRadius: '50%' }}>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{example}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: highlight ? 'var(--color-primary)' : 'var(--color-text)', minWidth: 40, textAlign: 'center' }}>
        {points}
      </span>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--color-primary)', fontSize: 18, lineHeight: 1.2, marginTop: 2, flexShrink: 0 }}>•</span>
      <div style={{ flex: 1, lineHeight: 1.6, fontSize: 14 }}>{children}</div>
    </div>
  )
}

function StagePill({ name, detail }: { name: string; detail: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', marginBottom: 6, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
      <span style={{ fontWeight: 800, fontSize: 14 }}>{name}</span>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{detail}</span>
    </div>
  )
}
