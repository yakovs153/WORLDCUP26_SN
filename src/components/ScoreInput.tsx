interface Props {
  value: number | null
  // Passes null when the field is cleared so the caller can render the
  // input as blank — not as "0" — until the user types again.
  onChange: (v: number | null) => void
  disabled?: boolean
  ariaLabel?: string
}

export default function ScoreInput({ value, onChange, disabled, ariaLabel }: Props) {
  return (
    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      min={0}
      max={30}
      value={value === null || value === undefined ? '' : value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '')
        if (raw === '') { onChange(null); return }
        const n = parseInt(raw, 10)
        onChange(Math.max(0, Math.min(30, n)))
      }}
      style={{
        width: 54,
        height: 54,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 800,
        background: disabled ? 'var(--color-bg-elevated)' : 'var(--color-bg)',
        color: 'var(--color-text)',
        border: '2px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-md)',
        outline: 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)'
        e.currentTarget.style.boxShadow = 'var(--shadow-glow)'
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-strong)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}
