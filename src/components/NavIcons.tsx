/**
 * Clean SVG icons for the bottom navigation. Each takes an `active` flag —
 * outlined when inactive, lightly filled when active (Instagram/WhatsApp
 * pattern). Uses currentColor so the parent's text color drives the stroke
 * and the active-color contrast works without per-icon tweaks.
 */

interface IconProps {
  size?: number
  active?: boolean
}

const baseProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true
})

/** Football / matches — circle with a pentagonal panel. */
export function MatchesIcon({ size = 26, active }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <circle cx="12" cy="12" r="9" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.18 : 1} />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l3.8 2.8-1.5 4.6h-4.6l-1.5-4.6z" fill={active ? 'currentColor' : 'none'} />
    </svg>
  )
}

/** My Picks — bookmark with checkmark inside. */
export function MyPicksIcon({ size = 26, active }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path
        d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"
        fill={active ? 'currentColor' : 'none'}
        opacity={active ? 0.18 : 1}
      />
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
      <path d="M9 10.5l2.2 2.2L15 9" />
    </svg>
  )
}

/** Teams / Groups — 2×2 grid of rounded squares (suggests group brackets). */
export function TeamsIcon({ size = 26, active }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <rect x="3" y="3"  width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.18 : 1} />
      <rect x="3" y="3"  width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.18 : 1} />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13"  width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.18 : 1} />
      <rect x="3" y="13"  width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.18 : 1} />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  )
}

/** Leaderboard — trophy with stand and handles. */
export function LeaderboardIcon({ size = 26, active }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path
        d="M7 4h10v6a5 5 0 0 1-10 0z"
        fill={active ? 'currentColor' : 'none'}
        opacity={active ? 0.18 : 1}
      />
      <path d="M7 4h10v6a5 5 0 0 1-10 0z" />
      <path d="M17 4h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3" />
      <path d="M7 4H5a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3" />
      <path d="M12 15v3" />
      <path d="M9 21h6" />
      <path d="M9 18h6" />
    </svg>
  )
}

/** Profile — head + shoulders silhouette. */
export function ProfileIcon({ size = 26, active }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <circle cx="12" cy="8" r="4" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.18 : 1} />
      <circle cx="12" cy="8" r="4" />
      <path
        d="M4 21a8 8 0 0 1 16 0"
        fill={active ? 'currentColor' : 'none'}
        opacity={active ? 0.18 : 1}
      />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

export type NavIconName = 'matches' | 'my' | 'teams' | 'leaderboard' | 'profile'

export function NavIcon({ name, size, active }: { name: NavIconName; size?: number; active?: boolean }) {
  switch (name) {
    case 'matches':     return <MatchesIcon size={size} active={active} />
    case 'my':          return <MyPicksIcon size={size} active={active} />
    case 'teams':       return <TeamsIcon size={size} active={active} />
    case 'leaderboard': return <LeaderboardIcon size={size} active={active} />
    case 'profile':     return <ProfileIcon size={size} active={active} />
  }
}
