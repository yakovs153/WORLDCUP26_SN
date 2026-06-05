import { useHallOfFame } from '../hooks/useHallOfFame'

const ROWS: { key: 'prophet' | 'optimist' | 'draw' | 'disaster'; emoji: string; title: string }[] = [
  { key: 'prophet', emoji: '🔮', title: 'הנביא' },
  { key: 'optimist', emoji: '🤡', title: 'האופטימי' },
  { key: 'draw', emoji: '🤝', title: 'מלך התיקו' },
  { key: 'disaster', emoji: '💔', title: 'אסון השבוע' }
]

/** Hall of Fame & Shame — auto-awarded superlatives. Renders nothing if empty. */
export default function HallOfFame() {
  const hof = useHallOfFame()
  const rows = ROWS.filter((r) => hof[r.key])
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
            </div>
          </div>
        )
      })}
    </section>
  )
}
