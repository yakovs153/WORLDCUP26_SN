import CubeMark from './CubeMark'

/**
 * The Octopus mascot — "פאול הקוביה": a StoreNext cube wrapped by an octopus.
 * Pure CSS/emoji so there's no image asset to ship or license. Used as the
 * Octopus player's avatar and across the app wherever the oracle appears.
 */
export default function OctopusMark({ size = 56, crowned = false }: { size?: number; crowned?: boolean }) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-primary) 55%, #1a1320), #1a1320)',
        boxShadow: '0 6px 18px rgba(225,29,72,0.35), inset 0 0 0 1px var(--glass-border)',
        flexShrink: 0
      }}
    >
      {/* cube peeking behind */}
      <span style={{ position: 'absolute', opacity: 0.55, transform: 'translateY(2px)' }}>
        <CubeMark size={Math.round(size * 0.46)} />
      </span>
      {/* octopus hugging it */}
      <span style={{ position: 'relative', fontSize: size * 0.62, lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>🐙</span>
      {crowned && (
        <span style={{ position: 'absolute', top: -size * 0.22, fontSize: size * 0.42, transform: 'rotate(-12deg)' }}>👑</span>
      )}
    </span>
  )
}
