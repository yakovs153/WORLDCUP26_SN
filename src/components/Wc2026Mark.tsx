import { useState } from 'react'

/** Optional licensed logo — drop public/wc2026-logo.png and it's used automatically. */
export const WC_LOGO_IMG = '/wc2026-logo.png'

/**
 * World Cup 2026 emblem. Uses a licensed logo if present at /wc2026-logo.png,
 * otherwise renders an ORIGINAL themed badge (trophy + 2026 + the three host
 * flags) — we avoid reproducing the trademarked FIFA logo.
 */
export default function Wc2026Mark({ height = 34 }: { height?: number }) {
  const [broken, setBroken] = useState(false)
  if (!broken) {
    return <img src={WC_LOGO_IMG} alt="World Cup 2026" height={height} onError={() => setBroken(true)} style={{ display: 'block' }} />
  }
  return (
    <span
      aria-label="גביע העולם 2026"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: height * 0.2,
        padding: `${height * 0.16}px ${height * 0.34}px`,
        borderRadius: 'var(--radius-full)',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
        color: '#fff', fontWeight: 900, fontFamily: 'var(--font-display)', lineHeight: 1,
        fontSize: height * 0.46, letterSpacing: 0.5,
        boxShadow: '0 4px 14px rgba(225,29,72,0.35)', whiteSpace: 'nowrap'
      }}
    >
      <span style={{ fontSize: height * 0.62 }}>🏆</span>
      <span>2026</span>
      <span style={{ fontSize: height * 0.5 }}>🇨🇦🇲🇽🇺🇸</span>
    </span>
  )
}
