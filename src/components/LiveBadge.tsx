interface Props {
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED'
}

export default function LiveBadge({ status }: Props) {
  if (status === 'LIVE') {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: '#fff',
          background: 'var(--color-danger)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          letterSpacing: 0.5
        }}
      >
        LIVE
        <span className="live-dot" />
      </span>
    )
  }
  if (status === 'FINISHED') {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          background: 'var(--color-bg-elevated)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)'
        }}
      >
        הסתיים
      </span>
    )
  }
  if (status === 'POSTPONED') {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          background: 'var(--color-bg-elevated)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)'
        }}
      >
        נדחה
      </span>
    )
  }
  return null
}
