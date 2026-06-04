import { useId, useState } from 'react'
import { COUNTRY_COLORS } from '../lib/players'
import { flagUrl } from '../lib/countryFlags'

interface Props {
  name: string
  countryCode: string
  photoUrl?: string
  size?: number
  showFlag?: boolean
  /**
   * 'circle' = round avatar (default; use for compact lists)
   * 'logo'   = hexagonal cube silhouette + red chevron above (StoreNext-style)
   */
  shape?: 'circle' | 'logo'
}

export default function PlayerAvatar({ name, countryCode, photoUrl, size = 48, showFlag = true, shape = 'circle' }: Props) {
  if (shape === 'logo') {
    return <LogoFramedAvatar name={name} countryCode={countryCode} photoUrl={photoUrl} size={size} showFlag={showFlag} />
  }
  return <CircleAvatar name={name} countryCode={countryCode} photoUrl={photoUrl} size={size} showFlag={showFlag} />
}

// ============================================================
// CircleAvatar — default round style
// ============================================================
function CircleAvatar({ name, countryCode, photoUrl, size, showFlag }: Required<Pick<Props, 'name' | 'countryCode' | 'size' | 'showFlag'>> & { photoUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  const colors = COUNTRY_COLORS[countryCode] || { bg: '#3d2c44', fg: '#f5f0f5' }
  const initials = getInitials(name)
  const useImage = photoUrl && !imgFailed

  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      {useImage ? (
        <img
          src={photoUrl}
          alt={name}
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            border: '2px solid rgba(255,255,255,0.1)'
          }}
        />
      ) : (
        <span
          aria-label={name}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.bg} 0%, ${darken(colors.bg, 0.15)} 100%)`,
            color: colors.fg,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: Math.max(size * 0.36, 12),
            fontFamily: 'var(--font-display)',
            letterSpacing: 0.5,
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            border: '2px solid rgba(255,255,255,0.08)',
            userSelect: 'none'
          }}
        >
          {initials}
        </span>
      )}
      {showFlag && <FlagChip code={countryCode} size={size} corner="bottom-start" />}
    </span>
  )
}

// ============================================================
// LogoFramedAvatar — hexagonal cube + red chevron (StoreNext-style)
// ============================================================
function LogoFramedAvatar({ name, countryCode, photoUrl, size, showFlag }: Required<Pick<Props, 'name' | 'countryCode' | 'size' | 'showFlag'>> & { photoUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  const colors = COUNTRY_COLORS[countryCode] || { bg: '#3d2c44', fg: '#f5f0f5' }
  const initials = getInitials(name)
  const useImage = photoUrl && !imgFailed
  const uid = useId().replace(/:/g, '')

  // SVG geometry — viewBox 100 wide × 115 tall (chevron above hexagon)
  // Hexagon (point-top), occupies y=18..112
  const HEX = '50,18 95,40 95,90 50,112 5,90 5,40'
  // Chevron above (bracket shape ^)
  const CHEVRON = 'M 22,15 L 50,0 L 78,15 L 64,15 L 50,7 L 36,15 Z'

  // Render at intrinsic size; aspect ratio ~1:1.15
  const w = size
  const h = Math.round(size * 1.15)

  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: w, height: h, flexShrink: 0 }}>
      <svg
        width={w}
        height={h}
        viewBox="0 0 100 115"
        style={{ display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={name}
      >
        <defs>
          {/* Clip the photo into the hex */}
          <clipPath id={`hex-${uid}`}>
            <polygon points={HEX} />
          </clipPath>
          {/* Subtle 3D-cube highlight gradient (right faces lighter, left darker) */}
          <linearGradient id={`light-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0,0,0,0.18)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
          </linearGradient>
          {/* Shadow under the avatar */}
          <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Red chevron — StoreNext-style signature above the cube */}
        <path d={CHEVRON} fill="#cc1f3e" filter={`url(#shadow-${uid})`} />

        {/* Background fill of the hex (so photo letterboxes look right + initials bg) */}
        <polygon points={HEX} fill={useImage ? '#1a1320' : colors.bg} filter={`url(#shadow-${uid})`} />

        {/* Photo, clipped */}
        {useImage && (
          <image
            href={photoUrl}
            x="5"
            y="18"
            width="90"
            height="94"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#hex-${uid})`}
            onError={() => setImgFailed(true)}
          />
        )}

        {/* Initials when no photo */}
        {!useImage && (
          <text
            x="50"
            y="76"
            textAnchor="middle"
            fontSize="34"
            fontWeight="900"
            fontFamily="Bebas Neue, Heebo, sans-serif"
            letterSpacing="1"
            fill={colors.fg}
          >
            {initials}
          </text>
        )}

        {/* 3D-cube highlight overlay (subtle) */}
        <polygon points={HEX} fill={`url(#light-${uid})`} pointerEvents="none" />

        {/* Outline */}
        <polygon
          points={HEX}
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="1.5"
          pointerEvents="none"
        />
      </svg>

      {showFlag && <FlagChip code={countryCode} size={size} corner="bottom-end" yOffset={-Math.round(size * 0.05)} />}
    </span>
  )
}

// ============================================================
// Small country-flag indicator (used by both shapes)
// ============================================================
function FlagChip({
  code,
  size,
  corner,
  yOffset = -2
}: {
  code: string
  size: number
  corner: 'bottom-start' | 'bottom-end'
  yOffset?: number
}) {
  const url = flagUrl(code)
  const dim = Math.round(size * 0.36)
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        bottom: yOffset,
        insetInlineStart: corner === 'bottom-start' ? -2 : undefined,
        insetInlineEnd: corner === 'bottom-end' ? -2 : undefined,
        width: dim,
        height: dim,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'var(--color-bg)',
        border: '2px solid var(--color-bg)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {url ? (
        <img src={url} alt={code} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>{code}</span>
      )}
    </span>
  )
}

// ============================================================
// Helpers
// ============================================================
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return parts[0][0] + parts[parts.length - 1][0]
}

function darken(hex: string, amount: number): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))))
  const toHex = (v: number) => v.toString(16).padStart(2, '0')
  return `#${toHex(f(r))}${toHex(f(g))}${toHex(f(b))}`
}
