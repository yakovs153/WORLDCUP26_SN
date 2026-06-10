import { useState } from 'react'
import CubeMark from './CubeMark'

/** Path to the analyst mascot. Drop the image at public/amos-avigdor.png and
 * it's used automatically everywhere; until then we fall back to a cube+🤖 mark. */
export const OCTOPUS_IMG = '/amos-avigdor.png'

/**
 * Avatar for "עמוס ואביגדור" — the StoreNext AI analysts. Renders their photo
 * when available, otherwise a CSS/emoji (🤖 + cube) fallback.
 */
export default function OctopusMark({ size = 56, crowned = false }: { size?: number; crowned?: boolean }) {
  const [broken, setBroken] = useState(false)
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
        overflow: 'hidden',
        background: broken
          ? 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-primary) 55%, #1a1320), #1a1320)'
          : '#eef6fb',
        boxShadow: '0 6px 18px rgba(225,29,72,0.30), inset 0 0 0 1px var(--glass-border)',
        flexShrink: 0
      }}
    >
      {broken ? (
        <>
          <span style={{ position: 'absolute', opacity: 0.55, transform: 'translateY(2px)' }}>
            <CubeMark size={Math.round(size * 0.46)} />
          </span>
          <span style={{ position: 'relative', fontSize: size * 0.62, lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>🎲</span>
        </>
      ) : (
        <img
          src={OCTOPUS_IMG}
          alt="עמוס ואביגדור"
          onError={() => setBroken(true)}
          style={{ width: '118%', height: '118%', objectFit: 'cover', objectPosition: '50% 40%' }}
        />
      )}
      {crowned && (
        <span style={{ position: 'absolute', top: -size * 0.2, fontSize: size * 0.42, transform: 'rotate(-12deg)', zIndex: 2 }}>👑</span>
      )}
    </span>
  )
}
