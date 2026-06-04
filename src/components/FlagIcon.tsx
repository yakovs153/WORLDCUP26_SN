import { useState } from 'react'
import { flagUrl } from '../lib/countryFlags'

interface Props {
  flag: string         // emoji fallback (from match data)
  code: string         // FIFA 3-letter code
  size?: number        // height in px
  rounded?: boolean    // rounded square vs flag rectangle
}

/**
 * Resolution order:
 *   1. Try SVG from flagcdn.com (real flag).
 *   2. If load fails (or no mapping), show the emoji fallback.
 *   3. If both fail, show a placeholder shield.
 */
export default function FlagIcon({ flag, code, size = 36, rounded = false }: Props) {
  const [errored, setErrored] = useState(false)
  const url = flagUrl(code)

  if (url && !errored) {
    const h = size
    // Flags are typically 3:2 ratio (width:height)
    const w = rounded ? size : Math.round(size * 1.5)
    return (
      <img
        src={url}
        alt={code}
        width={w}
        height={h}
        loading="lazy"
        style={{
          display: 'inline-block',
          objectFit: rounded ? 'cover' : 'cover',
          borderRadius: rounded ? '50%' : 4,
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          background: 'var(--color-bg-elevated)'
        }}
        onError={() => setErrored(true)}
      />
    )
  }

  if (flag) {
    return (
      <span
        aria-label={code}
        style={{
          fontSize: size,
          lineHeight: 1,
          display: 'inline-block',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))'
        }}
      >
        {flag}
      </span>
    )
  }

  return (
    <span
      aria-label={code}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--color-bg-elevated)',
        color: 'var(--color-text-muted)',
        fontSize: size * 0.4,
        fontWeight: 800
      }}
    >
      {code.slice(0, 3)}
    </span>
  )
}
