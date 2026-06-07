import { useState } from 'react'
import { flagUrl } from '../lib/countryFlags'

interface Props {
  flag: string         // emoji fallback (from match data)
  code: string         // FIFA 3-letter code
  size?: number        // height in px
  rounded?: boolean    // rounded square vs flag rectangle
}

/**
 * Resolution order (most reliable first):
 *   1. SVG from flagcdn.com (vector, sharp at any size).
 *   2. PNG from flagcdn.com (different cache path — recovers from a flaky SVG load).
 *   3. Emoji from the `flag` prop (works offline).
 *   4. Placeholder shield with the 3-letter code.
 */
export default function FlagIcon({ flag, code, size = 36, rounded = false }: Props) {
  const [stage, setStage] = useState<'svg' | 'png' | 'fallback'>('svg')
  const svg = flagUrl(code)
  // PNG variant — different URL → different browser cache key, so a flaky SVG
  // doesn't poison subsequent loads.
  const iso = svg ? svg.match(/\/([^/]+)\.svg$/)?.[1] : null
  const png = iso ? `https://flagcdn.com/w${Math.max(40, Math.round(size * 2))}/${iso}.png` : ''

  if ((stage === 'svg' && svg) || (stage === 'png' && png)) {
    const url = stage === 'svg' ? svg : png
    const h = size
    const w = rounded ? size : Math.round(size * 1.5)
    return (
      <img
        key={url}
        src={url}
        alt={code}
        width={w}
        height={h}
        loading="lazy"
        style={{
          display: 'inline-block',
          objectFit: 'cover',
          borderRadius: rounded ? '50%' : 4,
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          background: 'var(--color-bg-elevated)'
        }}
        onError={() => setStage(stage === 'svg' && png ? 'png' : 'fallback')}
      />
    )
  }

  if (flag) {
    return (
      <span
        aria-label={code}
        style={{ fontSize: size, lineHeight: 1, display: 'inline-block', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
      >
        {flag}
      </span>
    )
  }

  return (
    <span
      aria-label={code}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: '50%',
        background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)',
        fontSize: size * 0.4, fontWeight: 800
      }}
    >
      {code.slice(0, 3)}
    </span>
  )
}
