/**
 * StoreNext cube mark as inline SVG — red chevron crown above a plum cube.
 * Used as the logo fallback (until public/logo.png is provided) and as a
 * decorative motif (e.g. the match-card score divider).
 */
export default function CubeMark({ size = 30, title }: { size?: number; title?: string }) {
  const h = Math.round(size * 1.15)
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 100 115"
      role="img"
      aria-label={title || 'StoreNext'}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* red chevron crown */}
      <path d="M22 30 L50 14 L78 30 L64 30 L50 22 L36 30 Z" fill="var(--color-primary)" />
      {/* cube body — two facets meeting at a center seam, pointing down */}
      <polygon points="50,40 95,62 95,90 50,112" fill="#3a2a42" />
      <polygon points="50,40 5,62 5,90 50,112" fill="#2a1d31" />
      {/* center seam highlight */}
      <line x1="50" y1="40" x2="50" y2="112" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
    </svg>
  )
}
