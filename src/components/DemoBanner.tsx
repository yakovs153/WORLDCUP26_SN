import { DEMO_MODE } from '../firebase'

export default function DemoBanner() {
  if (!DEMO_MODE) return null
  return (
    <div
      style={{
        background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
        color: 'var(--color-text-inverse)',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 800,
        padding: '6px 12px',
        letterSpacing: 0.5
      }}
    >
      🎮 DEMO MODE — נתונים מקומיים, ניחושים נשמרים בדפדפן בלבד
    </div>
  )
}
