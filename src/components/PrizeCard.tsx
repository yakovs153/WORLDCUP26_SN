/**
 * The grand prize spotlight on the home screen. Hardcoded — the prize is a
 * coffee machine — so there's no admin field to keep in sync and the card can
 * use a richer, coffee-themed design.
 *
 * Uses a real SVG for the coffee illustration (not an emoji) so it stays
 * sharp at any size and renders the same across phones/desktop.
 */
export default function PrizeCard() {
  return (
    <div
      className="animate-in"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '18px 18px 18px 96px',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, color-mix(in srgb, #6f4e37 22%, var(--color-bg-elevated)) 0%, var(--color-bg-elevated) 55%, color-mix(in srgb, var(--color-accent) 14%, var(--color-bg-elevated)) 100%)',
        border: '1px solid color-mix(in srgb, var(--color-accent) 55%, var(--color-border-strong))',
        boxShadow: '0 6px 20px rgba(111,78,55,0.18)'
      }}
    >
      {/* Decorative SVG espresso cup on the right (RTL inside) — sharp at any size */}
      <CoffeeCup
        style={{
          position: 'absolute',
          insetInlineEnd: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 72,
          height: 72,
          pointerEvents: 'none'
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          insetInlineEnd: 78,
          top: 6,
          fontSize: 14,
          opacity: 0.7,
          pointerEvents: 'none'
        }}
      >
        ✨
      </span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          insetInlineEnd: 14,
          bottom: 4,
          fontSize: 11,
          opacity: 0.55,
          pointerEvents: 'none'
        }}
      >
        ✨
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--color-accent)' }}>
          <span>🏆</span>
          <span>הפרס הגדול</span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}>
          מכונת קפה איכותית
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          המנצח/ת זוכה בבקרים טובים יותר 😉
        </div>
      </div>
    </div>
  )
}

/**
 * Sharp SVG coffee illustration. A small espresso cup on a saucer with three
 * little steam wisps above it. Scales cleanly because everything is vector.
 */
function CoffeeCup({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={style} aria-hidden>
      <defs>
        <linearGradient id="cupBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="100%" stopColor="#d9cdb8" />
        </linearGradient>
        <linearGradient id="coffeeSurface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a5230" />
          <stop offset="100%" stopColor="#3d2817" />
        </linearGradient>
      </defs>

      {/* Steam wisps */}
      <path d="M28 12 C 28 8, 32 8, 32 4" stroke="#c9b89a" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M40 14 C 40 9, 44 9, 44 4" stroke="#c9b89a" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M52 12 C 52 8, 48 8, 48 4" stroke="#c9b89a" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.7" />

      {/* Handle (right side — RTL: cup faces left in this view) */}
      <path
        d="M58 32 C 70 32, 70 50, 58 50"
        stroke="#a78d6a"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Cup body */}
      <path
        d="M18 22 L 60 22 L 56 56 Q 56 60, 52 60 L 26 60 Q 22 60, 22 56 Z"
        fill="url(#cupBody)"
        stroke="#7a6a52"
        strokeWidth="1.5"
      />

      {/* Coffee surface (ellipse on top) */}
      <ellipse cx="39" cy="22.5" rx="21" ry="4.2" fill="url(#coffeeSurface)" />
      <ellipse cx="39" cy="22" rx="21" ry="4.2" fill="none" stroke="#5c3a1e" strokeWidth="0.8" opacity="0.45" />

      {/* Saucer */}
      <ellipse cx="39" cy="66" rx="32" ry="5" fill="#a78d6a" />
      <ellipse cx="39" cy="65" rx="32" ry="5" fill="#cdb78f" />
      <ellipse cx="39" cy="65" rx="26" ry="3" fill="none" stroke="#a78d6a" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}
