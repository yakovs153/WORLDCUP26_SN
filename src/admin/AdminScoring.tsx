import { useEffect, useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'
import { DEFAULT_APP_CONFIG, type MatchStage, type ScoringConfig, type HofCategory } from '../types'

const STAGES: { key: MatchStage; label: string }[] = [
  { key: 'GROUP', label: '🏟️ שלב הבתים' },
  { key: 'R32',   label: '3️⃣2️⃣ סיבוב 32' },
  { key: 'R16',   label: '1️⃣6️⃣ שמינית הגמר' },
  { key: 'QF',    label: '🎱 רבע הגמר' },
  { key: 'SF',    label: '🥈 חצי הגמר' },
  { key: 'TP',    label: '🥉 המקום השלישי' },
  { key: 'F',     label: '🏆 הגמר' }
]

// The metric behind each Hall-of-Fame category (fixed; label/emoji are editable).
const HOF_DESC: Record<string, string> = {
  prophet:  'הכי מדויק',
  optimist: 'הכי הרבה שערים',
  draw:     'הכי הרבה תיקו',
  disaster: 'הכי מעט נק׳'
}

export default function AdminScoring() {
  const cfg = useAppConfig()
  const toast = useToast()

  const [scoring, setScoring] = useState<ScoringConfig>(cfg.scoring)
  const [champion, setChampion] = useState(cfg.bonus.champion)
  const [topScorer, setTopScorer] = useState(cfg.bonus.topScorer)
  const [runnerUp, setRunnerUp] = useState(cfg.bonus.runnerUp)
  const [surprise, setSurprise] = useState(cfg.bonus.surprise)
  const [flop, setFlop] = useState(cfg.bonus.flop)
  const [hof, setHof] = useState<HofCategory[]>(cfg.hallOfFame)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setScoring(cfg.scoring)
    setChampion(cfg.bonus.champion)
    setTopScorer(cfg.bonus.topScorer)
    setRunnerUp(cfg.bonus.runnerUp)
    setSurprise(cfg.bonus.surprise)
    setFlop(cfg.bonus.flop)
    setHof(cfg.hallOfFame)
  }, [cfg])

  const dirty =
    JSON.stringify(scoring) !== JSON.stringify(cfg.scoring) ||
    champion !== cfg.bonus.champion ||
    topScorer !== cfg.bonus.topScorer ||
    runnerUp !== cfg.bonus.runnerUp ||
    surprise !== cfg.bonus.surprise ||
    flop !== cfg.bonus.flop ||
    JSON.stringify(hof) !== JSON.stringify(cfg.hallOfFame)

  const save = async () => {
    setSaving(true)
    try {
      await patchAppConfig({
        scoring,
        bonus: { champion, topScorer, runnerUp, surprise, flop },
        hallOfFame: hof
      })
      toast.show('ניקוד עודכן ✓', 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setScoring(DEFAULT_APP_CONFIG.scoring)
    setChampion(DEFAULT_APP_CONFIG.bonus.champion)
    setTopScorer(DEFAULT_APP_CONFIG.bonus.topScorer)
    setRunnerUp(DEFAULT_APP_CONFIG.bonus.runnerUp)
    setSurprise(DEFAULT_APP_CONFIG.bonus.surprise)
    setFlop(DEFAULT_APP_CONFIG.bonus.flop)
    setHof(DEFAULT_APP_CONFIG.hallOfFame)
  }

  const setStageField = (stage: MatchStage, field: 'exact' | 'direction', value: number) => {
    setScoring((prev) => ({ ...prev, [stage]: { ...prev[stage], [field]: value } }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Match scoring — per stage */}
      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 4 }}>
          ⚽ ניקוד משחקים (לפי שלב)
        </h3>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
          לכל שלב שני ערכים: <strong>כיוון</strong> (ניחוש מנצחת/תיקו) ו<strong>מדויק</strong> (תוצאה מדויקת).
          ניחוש שגוי = 0 נקודות.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8, padding: '8px 4px', alignItems: 'center', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 800 }}>שלב</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 800, textAlign: 'center' }}>כיוון</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 800, textAlign: 'center' }}>מדויק</span>
        </div>
        {STAGES.map((s) => (
          <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8, padding: '8px 4px', alignItems: 'center', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 14 }}>{s.label}</span>
            <PointInput value={scoring[s.key]?.direction ?? 0} onChange={(v) => setStageField(s.key, 'direction', v)} />
            <PointInput value={scoring[s.key]?.exact ?? 0} onChange={(v) => setStageField(s.key, 'exact', v)} highlight />
          </div>
        ))}
      </section>

      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 12 }}>
          🏆 ניקוד בונוס
        </h3>
        <BonusRow label="🏆 זוכה המונדיאל" value={champion}  onChange={setChampion} />
        <BonusRow label="🥈 סגנית (מפסידת הגמר)" value={runnerUp} onChange={setRunnerUp} />
        <BonusRow label="🐎 הפתעת הטורניר" value={surprise} onChange={setSurprise} />
        <BonusRow label="📉 האכזבה הגדולה" value={flop} onChange={setFlop} />
        <BonusRow label="⚽ מלך השערים"     value={topScorer} onChange={setTopScorer} />
      </section>

      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 4 }}>
          🏆🤡 היכל התהילה והבושה
        </h3>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
          קטגוריות שמוענקות אוטומטית בסוף כל יום. אפשר לשנות שם וסמל, להפעיל או להסתיר כל קטגוריה.
        </p>
        {hof.map((c, i) => (
          <div key={c.key} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--color-border)' }}>
            <input value={c.emoji} onChange={(e) => setHof(hof.map((x, j) => (j === i ? { ...x, emoji: e.target.value } : x)))}
              style={{ width: 44, textAlign: 'center', padding: '8px 4px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 18 }} />
            <input value={c.title} onChange={(e) => setHof(hof.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
              style={{ flex: 1, padding: '8px 10px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: 14 }} />
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 64 }}>{HOF_DESC[c.key]}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
              <input type="checkbox" checked={c.active} onChange={(e) => setHof(hof.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))} />
              פעיל
            </label>
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={save} disabled={!dirty || saving}>
          {saving ? 'שומר…' : 'שמירה'}
        </button>
        <button className="btn-ghost" onClick={reset} style={{ padding: '12px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
          איפוס לברירת מחדל
        </button>
      </div>
    </div>
  )
}

function BonusRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <PointInput value={value} onChange={onChange} highlight />
    </div>
  )
}

function PointInput({ value, onChange, highlight }: { value: number; onChange: (n: number) => void; highlight?: boolean }) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10))))}
      style={{
        padding: '8px 10px',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-md)',
        color: highlight ? 'var(--color-primary)' : 'var(--color-text)',
        fontFamily: 'var(--font-display)',
        fontSize: 20,
        fontWeight: 800,
        textAlign: 'center',
        outline: 'none',
        width: '100%'
      }}
    />
  )
}
