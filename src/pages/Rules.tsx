import { Link } from 'react-router-dom'
import { useAppConfig } from '../hooks/useAppConfig'

export default function Rules() {
  const cfg = useAppConfig()
  const s = cfg.scoring
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
        <Link
          to="/"
          className="btn-ghost"
          style={{
            padding: '6px 14px',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13
          }}
        >
          ← חזרה
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 28 }}>
          תקנון הניקוד
        </h1>
      </div>

      {cfg.content.rulesIntro && (
        <div className="card" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14 }}>
          {cfg.content.rulesIntro}
        </div>
      )}

      {/* Match scoring */}
      <Section title="ניחושי משחקים" icon="⚽">
        <ScoringRow
          icon="🎯"
          label="תוצאה מדויקת"
          example="ניחשת 2-1 — יצא 2-1"
          points={s.exact}
          highlight
        />
        <ScoringRow
          icon="✅"
          label="מנצחת + הפרש שערים נכון"
          example="ניחשת 3-1 — יצא 2-0"
          points={s.winnerAndDiff}
        />
        <ScoringRow
          icon="➕"
          label="מנצחת נכונה בלבד"
          example="ניחשת 2-1 — יצא 3-0 (גם תיקו נכון נספר)"
          points={s.winnerOnly}
        />
        <ScoringRow
          icon="❌"
          label="ניחוש שגוי"
          example="ניחשת ניצחון בית — יצא חוץ"
          points={0}
        />
      </Section>

      {/* Per-stage multipliers */}
      <Section title="מכפיל נקודות לפי שלב" icon="📈">
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          ככל שמתקדמים בטורניר, המשחקים שווים יותר. נקודות המשחק מוכפלות לפי השלב.
        </p>
        {([
          ['GROUP', 'שלב הבתים'], ['R32', 'סיבוב 32'], ['R16', 'שמינית הגמר'],
          ['QF', 'רבע הגמר'], ['SF', 'חצי הגמר'], ['TP', 'המקום השלישי'], ['F', 'הגמר']
        ] as const).map(([key, label]) => (
          <StagePill key={key} name={label} detail={`× ${cfg.stageMultipliers[key]}`} />
        ))}
      </Section>

      {/* Bonus scoring */}
      <Section title="ניחושי בונוס" icon="🏆">
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          ניחושים מיוחדים שיש להגיש <strong style={{ color: 'var(--color-text)' }}>לפני תחילת הטורניר</strong>.
          ניתן לעדכן עד למשחק הראשון, ולאחר מכן הם ננעלים.
        </p>
        <ScoringRow
          icon="🏆"
          label="זוכה המונדיאל"
          example="בחר את הנבחרת שתזכה בגביע"
          points={b.champion}
          highlight
        />
        <ScoringRow
          icon="⚽"
          label="מלך השערים"
          example="הכובש המוביל בכל הטורניר"
          points={b.topScorer}
          highlight
        />
        <ScoringRow
          icon="🥈"
          label="הסגנית (מפסידת הגמר)"
          example="הנבחרת שתפסיד בגמר"
          points={b.runnerUp}
        />
        <ScoringRow
          icon="🐎"
          label="הפתעת הטורניר"
          example="אאוטסיידרית שתגיע לפחות לרבע הגמר"
          points={b.surprise}
        />
        <ScoringRow
          icon="📉"
          label="האכזבה הגדולה"
          example="אחת מ-8 הגדולות שתיפול ותודח מוקדם"
          points={b.flop}
        />
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            background: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13
          }}
        >
          <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>סה״כ בונוס מקסימלי: {b.champion + b.topScorer + b.runnerUp + b.surprise + b.flop} נקודות</span>
        </div>
      </Section>

      {/* Important rules */}
      <Section title="חוקים חשובים" icon="📌">
        <Bullet>ניתן לעדכן ניחוש <strong>עד 5 דקות לפני</strong> שריקת הפתיחה של המשחק.</Bullet>
        <Bullet>5 דקות לפני תחילת המשחק הניחוש <strong>ננעל</strong> ולא ניתן לשינוי.</Bullet>
        <Bullet>
          <strong>תוצאה לחישוב נקודות:</strong> בשלב הבתים — תוצאת 90 הדקות.
          בשלבי הנוקאאוט — התוצאה לאחר ההארכה (עד 120 דקות), <strong>ללא דו-קרב פנדלים</strong>.
        </Bullet>
        <Bullet>
          <strong>שוויון בהימורי בונוס</strong> (מלך השערים, הפתעת הטורניר, האכזבה) — כל הניחושים הזוכים יקבלו את מלוא הנקודות.
        </Bullet>
        <Bullet>ניחושי הבונוס נשמרים עד פתיחת המשחק הראשון בטורניר, ואינם ניתנים לשינוי לאחר מכן.</Bullet>
        <Bullet>תוצאות מתעדכנות אוטומטית מתוצאות חיות — אין צורך לרענן.</Bullet>
        <Bullet>הניקוד מחושב מיד בסיום המשחק; הנקודות מתעדכנות אוטומטית בפרופיל ובדירוג.</Bullet>
        <Bullet>שכחת לנחש? 🤖 טום האנליסט (ה-AI שלנו) ינחש עבורך אוטומטית עם פתיחת המשחק — אבל תקבל רק <strong>50%</strong> מהנקודות על ניחוש כזה. אז עדיף תמיד לנחש בעצמך!</Bullet>
      </Section>

      {/* Tournament stages */}
      <Section title="שלבי הטורניר" icon="🗺️">
        <StagePill name="שלב הבתים" detail="12 בתים (A–L) · 3 משחקים לכל קבוצה · 72 משחקים" />
        <StagePill name="סיבוב 32" detail="32 הקבוצות הטובות מעפילות (32 → 16)" />
        <StagePill name="שמינית הגמר" detail="16 קבוצות → 8" />
        <StagePill name="רבע הגמר" detail="8 → 4" />
        <StagePill name="חצי הגמר" detail="4 → 2" />
        <StagePill name="המקום ה־3" detail="המפסידות בחצי הגמר" />
        <StagePill name="הגמר 🏆" detail="המשחק על הגביע" />
      </Section>

      {cfg.content.rulesNotes && (
        <Section title="הערות נוספות" icon="📝">
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14 }}>{cfg.content.rulesNotes}</div>
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  icon,
  children
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <section className="card animate-in" style={{ padding: 'var(--space-4)' }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          letterSpacing: 1,
          fontSize: 20,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <span aria-hidden style={{ fontSize: 22 }}>
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function ScoringRow({
  icon,
  label,
  example,
  points,
  highlight
}: {
  icon: string
  label: string
  example: string
  points: number
  highlight?: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '12px 4px',
        borderTop: '1px solid var(--color-border)'
      }}
    >
      <span
        style={{
          fontSize: 22,
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--color-bg-elevated)',
          borderRadius: '50%'
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{example}</div>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 900,
          color: highlight ? 'var(--color-primary)' : points === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
          minWidth: 40,
          textAlign: 'center'
        }}
      >
        {points}
      </span>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', alignItems: 'flex-start' }}>
      <span
        style={{
          color: 'var(--color-primary)',
          fontSize: 18,
          lineHeight: 1.2,
          marginTop: 2,
          flexShrink: 0
        }}
      >
        •
      </span>
      <div style={{ flex: 1, lineHeight: 1.6, fontSize: 14 }}>{children}</div>
    </div>
  )
}

function StagePill({ name, detail }: { name: string; detail: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        marginBottom: 6,
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)'
      }}
    >
      <span style={{ fontWeight: 800, fontSize: 14 }}>{name}</span>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{detail}</span>
    </div>
  )
}
