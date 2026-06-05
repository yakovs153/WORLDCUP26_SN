import { useHallOfFame } from '../hooks/useHallOfFame'
import { useAppConfig } from '../hooks/useAppConfig'

/** Hall of Fame & Shame — admin-configured superlatives. Renders nothing if empty. */
export default function HallOfFame() {
  const hof = useHallOfFame()
  const cfg = useAppConfig()
  const rows = cfg.hallOfFame.filter((c) => c.active && hof[c.key])
  if (rows.length === 0) return null

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 16 }}>🏆🤡 היכל התהילה והבושה</h3>
      {rows.map((r) => {
        const a = hof[r.key]!
        return (
          <div key={r.key} className="glass" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
            <span style={{ fontSize: 22 }}>{r.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{r.title} · {a.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{a.detail}</div>
              {a.blurb && <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-accent)', marginTop: 2 }}>🤖 {a.blurb}</div>}
            </div>
          </div>
        )
      })}
    </section>
  )
}
