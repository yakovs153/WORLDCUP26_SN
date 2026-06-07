import { NavLink } from 'react-router-dom'

/**
 * Sub-tab switcher shown at the top of /my and /bonus. Lets the user move
 * between their match predictions and their bonus picks without having to
 * dig through the bottom nav (Option A IA — bonus is no longer a top-level
 * tab; it lives inside "My Picks").
 */
export default function MyPicksSubTabs() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        padding: 4,
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--color-border)'
      }}
    >
      <Tab to="/my"    label="🎯 משחקים" />
      <Tab to="/bonus" label="🏆 בונוס" />
    </div>
  )
}

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      style={({ isActive }) => ({
        padding: '10px 8px',
        borderRadius: 'var(--radius-full)',
        background: isActive ? 'var(--color-surface)' : 'transparent',
        color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
        fontWeight: 800,
        fontSize: 14,
        textAlign: 'center',
        textDecoration: 'none',
        transition: 'background 0.15s ease, color 0.15s ease'
      })}
    >
      {label}
    </NavLink>
  )
}
