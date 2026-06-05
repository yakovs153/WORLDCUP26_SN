import { Link } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'

/** A thin pulsing strip at the top of the home screen while any match is live. */
export default function LiveStrip() {
  const { matches } = useMatches()
  const live = matches.find((m) => m.status === 'LIVE')
  if (!live) return null
  return (
    <Link
      to={`/match/${live.id}`}
      className="live-strip"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '10px 14px', borderRadius: 'var(--radius-md)', textDecoration: 'none',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
        color: '#fff', fontWeight: 800, fontSize: 14
      }}
    >
      <span className="live-dot" aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />
      🔴 חי: {live.homeTeam.name} {live.homeScore ?? 0}–{live.awayScore ?? 0} {live.awayTeam.name}
      {live.minute != null ? ` · ${live.minute}'` : ''}
    </Link>
  )
}
