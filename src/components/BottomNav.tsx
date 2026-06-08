import { NavLink } from 'react-router-dom'
import { NavIcon, type NavIconName } from './NavIcons'

// 5-tab IA (Option A from the colleague-feedback redesign):
//   Home · My Picks · Groups · Rank · Profile
// Bonus is now a sub-tab inside My Picks; surveys live as a card on Profile.
// The big bonus reminder on the home page still deep-links straight to /bonus.
const ITEMS: { to: string; label: string; icon: NavIconName }[] = [
  { to: '/',            label: 'משחקים',      icon: 'matches' },
  { to: '/my',          label: 'ניחושים שלי', icon: 'my' },
  { to: '/teams',       label: 'בתים',        icon: 'teams' },
  { to: '/leaderboard', label: 'דירוג',       icon: 'leaderboard' },
  { to: '/profile',     label: 'פרופיל',      icon: 'profile' }
]

export default function BottomNav() {
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
      {ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            padding: '6px 4px',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontSize: 11,
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isActive ? 'scale(1.06)' : 'scale(1)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <NavIcon name={it.icon} active={isActive} size={26} />
              </span>
              {it.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
