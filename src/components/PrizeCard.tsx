/**
 * The grand prize spotlight on the home screen. Hardcoded — the prize is a
 * coffee machine — so there's no admin field to keep in sync and the card can
 * use a richer, coffee-themed design.
 */
export default function PrizeCard() {
  return (
    <div
      className="animate-in"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '18px 18px 18px 88px',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, color-mix(in srgb, #6f4e37 22%, var(--color-bg-elevated)) 0%, var(--color-bg-elevated) 55%, color-mix(in srgb, var(--color-accent) 14%, var(--color-bg-elevated)) 100%)',
        border: '1px solid color-mix(in srgb, var(--color-accent) 55%, var(--color-border-strong))',
        boxShadow: '0 6px 20px rgba(111,78,55,0.18)'
      }}
    >
      {/* Decorative coffee art on the right (RTL inside) — large, slightly tilted */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          insetInlineEnd: 10,
          top: '50%',
          transform: 'translateY(-50%) rotate(-6deg)',
          fontSize: 56,
          lineHeight: 1,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
          pointerEvents: 'none'
        }}
      >
        ☕
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          insetInlineEnd: 56,
          top: 8,
          fontSize: 16,
          opacity: 0.7,
          pointerEvents: 'none'
        }}
      >
        ✨
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          insetInlineEnd: 12,
          bottom: 6,
          fontSize: 12,
          opacity: 0.6,
          pointerEvents: 'none'
        }}
      >
        ✨
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--color-accent)' }}>
          <span>🏆</span>
          <span>הפרס הגדול</span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}>
          מכונת קפה איכותית
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          המנצח/ת זוכה בבקרים טובים יותר ☕😉
        </div>
      </div>
    </div>
  )
}
