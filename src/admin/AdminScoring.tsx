import { useEffect, useState } from 'react'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useToast } from '../components/Toast'
import { DEFAULT_APP_CONFIG, type MatchStage, type StageMultipliers } from '../types'

const STAGES: { key: MatchStage; label: string }[] = [
  { key: 'GROUP', label: '🏟️ שלב הבתים' },
  { key: 'R32', label: '3️⃣2️⃣ סיבוב 32' },
  { key: 'R16', label: '1️⃣6️⃣ שמינית הגמר' },
  { key: 'QF', label: '🎱 רבע הגמר' },
  { key: 'SF', label: '🥈 חצי הגמר' },
  { key: 'TP', label: '🥉 המקום השלישי' },
  { key: 'F', label: '🏆 הגמר' }
]

export default function AdminScoring() {
  const cfg = useAppConfig()
  const toast = useToast()

  const [exact, setExact] = useState(cfg.scoring.exact)
  const [winDiff, setWinDiff] = useState(cfg.scoring.winnerAndDiff)
  const [winOnly, setWinOnly] = useState(cfg.scoring.winnerOnly)
  const [champion, setChampion] = useState(cfg.bonus.champion)
  const [topScorer, setTopScorer] = useState(cfg.bonus.topScorer)
  const [runnerUp, setRunnerUp] = useState(cfg.bonus.runnerUp)
  const [surprise, setSurprise] = useState(cfg.bonus.surprise)
  const [stageMult, setStageMult] = useState<StageMultipliers>(cfg.stageMultipliers)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setExact(cfg.scoring.exact)
    setWinDiff(cfg.scoring.winnerAndDiff)
    setWinOnly(cfg.scoring.winnerOnly)
    setChampion(cfg.bonus.champion)
    setTopScorer(cfg.bonus.topScorer)
    setRunnerUp(cfg.bonus.runnerUp)
    setSurprise(cfg.bonus.surprise)
    setStageMult(cfg.stageMultipliers)
  }, [cfg])

  const dirty =
    exact !== cfg.scoring.exact ||
    winDiff !== cfg.scoring.winnerAndDiff ||
    winOnly !== cfg.scoring.winnerOnly ||
    champion !== cfg.bonus.champion ||
    topScorer !== cfg.bonus.topScorer ||
    runnerUp !== cfg.bonus.runnerUp ||
    surprise !== cfg.bonus.surprise ||
    JSON.stringify(stageMult) !== JSON.stringify(cfg.stageMultipliers)

  const save = async () => {
    setSaving(true)
    try {
      await patchAppConfig({
        scoring: { exact, winnerAndDiff: winDiff, winnerOnly: winOnly },
        stageMultipliers: stageMult,
        bonus: { champion, topScorer, runnerUp, surprise }
      })
      toast.show('ניקוד עודכן ✓', 'success')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setExact(DEFAULT_APP_CONFIG.scoring.exact)
    setWinDiff(DEFAULT_APP_CONFIG.scoring.winnerAndDiff)
    setWinOnly(DEFAULT_APP_CONFIG.scoring.winnerOnly)
    setChampion(DEFAULT_APP_CONFIG.bonus.champion)
    setTopScorer(DEFAULT_APP_CONFIG.bonus.topScorer)
    setRunnerUp(DEFAULT_APP_CONFIG.bonus.runnerUp)
    setSurprise(DEFAULT_APP_CONFIG.bonus.surprise)
    setStageMult(DEFAULT_APP_CONFIG.stageMultipliers)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 12 }}>
          ⚽ ניקוד משחקים
        </h3>
        <PointInput label="🎯 תוצאה מדויקת"               value={exact}    onChange={setExact}    />
        <PointInput label="✅ מנצחת + הפרש שערים נכון"     value={winDiff}  onChange={setWinDiff}  />
        <PointInput label="➕ מנצחת נכונה בלבד"             value={winOnly}  onChange={setWinOnly}  />
      </section>

      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 12 }}>
          🏆 ניקוד בונוס
        </h3>
        <PointInput label="🏆 זוכה המונדיאל" value={champion}  onChange={setChampion} />
        <PointInput label="🥈 סגנית (מפסידת הגמר)" value={runnerUp} onChange={setRunnerUp} />
        <PointInput label="🐎 הפתעת הטורניר" value={surprise} onChange={setSurprise} />
        <PointInput label="⚽ מלך השערים"     value={topScorer} onChange={setTopScorer} />
      </section>

      <section className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16, marginBottom: 4 }}>
          📈 מכפיל נקודות לפי שלב
        </h3>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
          נקודות המשחק מוכפלות לפי השלב. למשל מכפיל 3 בגמר = פי 3 נקודות. מכפיל 1 = רגיל.
        </p>
        {STAGES.map((s) => (
          <PointInput key={s.key} label={s.label} value={stageMult[s.key]} onChange={(v) => setStageMult((p) => ({ ...p, [s.key]: v }))} />
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

function PointInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px',
        gap: 12,
        alignItems: 'center',
        padding: '8px 0',
        borderTop: '1px solid var(--color-border)'
      }}
    >
      <span style={{ fontSize: 14 }}>{label}</span>
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
          color: 'var(--color-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 800,
          textAlign: 'center',
          outline: 'none',
          width: '100%'
        }}
      />
    </div>
  )
}
