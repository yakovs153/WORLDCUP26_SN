import { useEffect, useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAppConfig } from '../hooks/useAppConfig'
import { patchAppConfig } from '../lib/appConfig'
import { useGoldenBoot } from '../hooks/useGoldenBoot'
import { TOP_SCORER_CANDIDATES } from '../lib/players'
import { useToast } from '../components/Toast'

/**
 * Manual Golden Boot control — until the api-football auto-track is wired up.
 *  • Goal tallies per candidate -> stats/goldenBoot (drives the race display).
 *  • Official top scorer winner(s) -> appConfig/main.bonusResults
 *    { topScorers, topScorerLocked:true } so the bonus resolves + the auto-track
 *    (when enabled) won't override the admin's manual choice.
 */
const SCORERS = TOP_SCORER_CANDIDATES.filter((p) => p.name !== 'אחר')

export default function AdminGoldenBoot() {
  const cfg = useAppConfig()
  const liveGoals = useGoldenBoot()
  const toast = useToast()

  const [goals, setGoals] = useState<Record<string, number>>({})
  const [seeded, setSeeded] = useState(false)
  const [winners, setWinners] = useState<string[]>([])
  const [savingGoals, setSavingGoals] = useState(false)
  const [savingWinner, setSavingWinner] = useState(false)

  // Seed editable state once from the live doc / config.
  useEffect(() => {
    if (!seeded && Object.keys(liveGoals).length) { setGoals(liveGoals); setSeeded(true) }
  }, [liveGoals, seeded])
  useEffect(() => { setWinners(cfg.bonusResults?.topScorers ?? (cfg.bonusResults?.topScorer ? [cfg.bonusResults.topScorer] : [])) }, [cfg.bonusResults])

  const setGoal = (name: string, v: string) => {
    const n = Math.max(0, Math.floor(Number(v) || 0))
    setGoals((g) => ({ ...g, [name]: n }))
  }

  const saveGoals = async () => {
    setSavingGoals(true)
    try {
      const clean: Record<string, number> = {}
      for (const [k, v] of Object.entries(goals)) if (v > 0) clean[k] = v
      await setDoc(doc(db, 'stats', 'goldenBoot'), { goals: clean, updatedAt: serverTimestamp() }, { merge: true })
      toast.show('שערים נשמרו ✓', 'success')
    } catch (e) { toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error') }
    finally { setSavingGoals(false) }
  }

  const toggleWinner = (name: string) =>
    setWinners((w) => (w.includes(name) ? w.filter((x) => x !== name) : [...w, name]))

  const saveWinner = async () => {
    setSavingWinner(true)
    try {
      await patchAppConfig({ bonusResults: { ...cfg.bonusResults, topScorers: winners, topScorerLocked: true } })
      toast.show(winners.length ? 'מלך השערים נקבע ✓ (הבונוס יחושב)' : 'הזוכה נוקה', 'success')
    } catch (e) { toast.show(e instanceof Error ? e.message : 'שמירה נכשלה', 'error') }
    finally { setSavingWinner(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: 56, padding: '6px 8px', textAlign: 'center', background: 'var(--glass-bg-hi)',
    border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: 14
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)' }}>👟 מספר שערים</h3>
          <p className="text-muted" style={{ fontSize: 12 }}>עדכון ידני של מספר השערים לכל מועמד — מזין את מרוץ מלך השערים במסך הבית.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 12px', alignItems: 'center' }}>
          {SCORERS.map((p) => (
            <div key={p.name} style={{ display: 'contents' }}>
              <span style={{ fontSize: 14 }}>{p.display}</span>
              <input type="number" min={0} inputMode="numeric" style={inputStyle}
                value={goals[p.name] ?? 0} onChange={(e) => setGoal(p.name, e.target.value)} />
            </div>
          ))}
        </div>
        <button className="btn" onClick={saveGoals} disabled={savingGoals} style={{ alignSelf: 'flex-start' }}>
          {savingGoals ? 'שומר…' : 'שמירת שערים'}
        </button>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)' }}>🏆 מלך השערים הרשמי (בונוס)</h3>
          <p className="text-muted" style={{ fontSize: 12 }}>בחרו את הזוכה (או כמה, אם שוויון). קביעה זו מחשבת את בונוס מלך השערים לכל המשתתפים ונועלת אותה מפני עדכון אוטומטי. בדרך כלל נקבע בסוף הטורניר.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SCORERS.map((p) => {
            const on = winners.includes(p.name)
            return (
              <button key={p.name} onClick={() => toggleWinner(p.name)} style={{
                padding: '7px 12px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 700,
                background: on ? 'var(--color-primary)' : 'transparent',
                color: on ? 'var(--color-on-primary)' : 'var(--color-text)',
                border: `1px solid ${on ? 'var(--color-primary)' : 'var(--color-border-strong)'}`
              }}>{on ? '✓ ' : ''}{p.name}</button>
            )
          })}
        </div>
        <button className="btn" onClick={saveWinner} disabled={savingWinner} style={{ alignSelf: 'flex-start' }}>
          {savingWinner ? 'שומר…' : 'קביעת מלך השערים'}
        </button>
      </div>
    </div>
  )
}
