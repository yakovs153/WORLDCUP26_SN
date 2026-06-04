import type { CSSProperties } from 'react'

interface Props {
  width?: number | string
  height?: number | string
  radius?: number | string
  style?: CSSProperties
}

export default function Skeleton({ width = '100%', height = 16, radius = 8, style }: Props) {
  return (
    <span
      className="skeleton-shimmer"
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, var(--color-surface) 0%, var(--color-surface-hover) 50%, var(--color-surface) 100%)',
        backgroundSize: '200% 100%',
        ...style
      }}
    />
  )
}

export function MatchCardSkeleton() {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--color-bg-elevated)',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <Skeleton width={60} height={12} />
        <Skeleton width={40} height={12} />
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Skeleton width={56} height={42} radius={4} />
            <Skeleton width={70} height={14} />
          </div>
          <Skeleton width={50} height={28} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Skeleton width={56} height={42} radius={4} />
            <Skeleton width={70} height={14} />
          </div>
        </div>
        <Skeleton height={70} radius={12} />
        <Skeleton height={40} radius={12} />
      </div>
    </div>
  )
}

export function LeaderboardRowSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)'
      }}
    >
      <Skeleton width={28} height={28} radius="50%" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton width={32} height={32} radius="50%" />
        <div>
          <Skeleton width={100} height={14} />
          <div style={{ height: 4 }} />
          <Skeleton width={70} height={10} />
        </div>
      </div>
      <Skeleton width={40} height={22} />
    </div>
  )
}
