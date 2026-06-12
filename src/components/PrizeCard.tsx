/**
 * The grand prize spotlight on the home screen.
 *
 * This is a designed banner image (text baked in: "הפרס הגדול / עבור המקום
 * הראשון! / מכונת קפה נספרסו יוקרתית / השתתפו וזכו!"). We render it full-bleed
 * and preserve its aspect ratio so it stays crisp on phones and desktop.
 *
 * The source file lives at public/prize-banner.jpg — replace that file to
 * change the prize artwork; no code change needed.
 */
const BANNER_SRC = '/prize-banner.jpg'
// Intrinsic size of the artwork (used to reserve space and avoid layout shift).
// Ratio matches the source artwork (public/prize-banner.jpg, 1024×339) so it
// fills the card width with no cropping. Replace the file + this ratio together.
const BANNER_RATIO = '1024 / 339'

export default function PrizeCard() {
  return (
    <div
      className="animate-in"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        border: '1px solid color-mix(in srgb, var(--color-accent) 55%, var(--color-border-strong))',
        boxShadow: '0 6px 20px rgba(111,78,55,0.18)',
        lineHeight: 0,
        width: '100%'
      }}
    >
      <img
        src={BANNER_SRC}
        alt="הפרס הגדול עבור המקום הראשון — מכונת קפה נספרסו יוקרתית. השתתפו וזכו!"
        loading="lazy"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          aspectRatio: BANNER_RATIO,
          objectFit: 'cover'
        }}
      />
    </div>
  )
}
