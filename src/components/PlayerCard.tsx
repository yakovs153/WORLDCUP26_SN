import PlayerAvatar from './PlayerAvatar'
import { ringColors } from '../lib/players'

/**
 * Golden Boot collectible card (the approved "glass trading card" — style B).
 * Face framed in the StoreNext cube, national-colour glow, name, rank medal,
 * and live goal tally.
 */
export default function PlayerCard({
  name,
  countryCode,
  countryLabel,
  photoUrl,
  goals,
  rank,
  selected,
  onClick
}: {
  name: string
  countryCode: string
  countryLabel?: string
  photoUrl?: string
  goals: number
  rank: number
  selected?: boolean
  onClick?: () => void
}) {
  const c = ringColors(countryCode)
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

  return (
    <button
      onClick={onClick}
      className="glass card-3d"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '16px 12px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        border: selected ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
        boxShadow: selected ? '0 0 0 2px rgba(225,29,72,0.5), var(--glass-shadow)' : 'var(--glass-shadow)'
      }}
    >
      {/* national-colour glow */}
      <span
        aria-hidden
        style={{
          position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
          width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle, ${c.a} 0%, transparent 70%)`,
          opacity: 0.5, filter: 'blur(20px)', pointerEvents: 'none'
        }}
      />
      <span style={{ position: 'absolute', top: 8, insetInlineStart: 10, fontSize: 13, fontWeight: 800, color: 'var(--color-text-muted)' }}>
        {medal}
      </span>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <PlayerAvatar name={name} countryCode={countryCode} photoUrl={photoUrl} size={64} shape="logo" />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 0.5, lineHeight: 1.1 }}>{name}</div>
        {countryLabel && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{countryLabel}</div>}
      </div>

      <span
        style={{
          position: 'relative', zIndex: 1,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 12px', borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))',
          color: '#fff', fontWeight: 800, fontSize: 13,
          boxShadow: '0 4px 12px rgba(225,29,72,0.35)'
        }}
      >
        ⚽ {goals} {goals === 1 ? 'גול' : 'גולים'}
      </span>

      {selected && (
        <span style={{ position: 'absolute', top: 8, insetInlineEnd: 10, color: 'var(--color-primary)', fontSize: 16 }}>✓</span>
      )}
    </button>
  )
}
