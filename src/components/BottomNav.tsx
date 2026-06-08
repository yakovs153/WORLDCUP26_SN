import { NavLink } from 'react-router-dom'
import { useAppConfig } from '../hooks/useAppConfig'

// 5-tab IA (Option A from the colleague-feedback redesign):
//   Home · My Picks · Groups · Rank · Profile
// Bonus is now a sub-tab inside My Picks; surveys live as a card on Profile.
// The big bonus reminder on the home page still deep-links straight to /bonus.
const ITEMS: { to: string; label: string; key?: keyof import('../types').NavIconsConfig; icon?: string }[] = [
  { to: '/',            label: 'משחקים', key: 'matches' },
  { to: '/my',          label: 'ניחושים שלי', key: 'my' },
  { to: '/teams',       label: 'בתים',   icon: '🌍' },
  { to: '/leaderboard', label: 'דירוג',  key: 'leaderboard' },
  { to: '/profile',     label: 'פרופיל', key: 'profile' }
]

export default function BottomNav() {
  const cfg = useAppConfig()
  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        height: 'var(--bottom-nav-height)',
        background: 'var(--glass-bg)',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        backdropFilter: 'blur(var(--glass-blur))',
        borderTop: '1px solid var(--glass-border)',
        display: 'grid',
        gridTemplateColumns: `repeat(${ITEMS.length}, 1fr)`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {ITEMS.map((it) => {
        const icon = it.icon ?? cfg.navIcons[it.key!]
        return (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '6px 4px',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              position: 'relative',
              transition: 'color 0.15s ease'
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 0,
                      width: 44,
                      height: 3,
                      background: 'var(--color-primary)',
                      borderRadius: '0 0 var(--radius-full) var(--radius-full)'
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                    filter: isActive ? 'drop-shadow(0 1px 3px rgba(225,29,72,0.4))' : 'none'
                  }}
                >
                  {icon}
                </span>
                {it.label}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
