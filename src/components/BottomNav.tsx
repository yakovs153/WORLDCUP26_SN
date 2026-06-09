import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useAppConfig } from '../hooks/useAppConfig'
import { useAuth } from '../auth/AuthProvider'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'

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
  const { user } = useAuth()
  const { matches } = useMatches()
  const { byMatchId } = usePredictions(user?.uid ?? null)

  // Red dot on the משחקים tab when there are unpredicted SCHEDULED matches
  // in the next 3 days. Standard mobile-notification pattern: visible from
  // anywhere in the app, disappears once the user catches up.
  const hasUnpredicted = useMemo(() => {
    const now = Date.now()
    const THREE_DAYS_MS = 3 * 86_400_000
    for (const m of matches) {
      if (m.status !== 'SCHEDULED') continue
      if (byMatchId[m.id]) continue
      const diff = m.kickoff.toMillis() - now
      if (diff > 0 && diff < THREE_DAYS_MS) return true
    }
    return false
  }, [matches, byMatchId])

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
                    position: 'relative',
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
                  {/* Unpredicted-matches red dot — only on the משחקים tab. */}
                  {it.key === 'matches' && hasUnpredicted && (
                    <span
                      aria-label="יש משחקים שעדיין לא ניחשת"
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: -2,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: 'var(--color-danger)',
                        border: '2px solid var(--color-surface)'
                      }}
                    />
                  )}
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
