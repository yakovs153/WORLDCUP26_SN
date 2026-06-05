import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { computeGroupStandings, type TeamStanding } from '../lib/standings'
import FlagIcon from '../components/FlagIcon'
import GoldenBootRace from '../components/GoldenBootRace'
import { MatchCardSkeleton } from '../components/Skeleton'
import { useGoldenBoot } from '../hooks/useGoldenBoot'
import { useBonus } from '../hooks/useBonus'
import { useAppConfig } from '../hooks/useAppConfig'
import { useAuth } from '../auth/AuthProvider'
import { TOP_SCORER_CANDIDATES, type PlayerOption } from '../lib/players'

export default function Teams() {
  const { user } = useAuth()
  const { matches, loading } = useMatches()
  const groups = useMemo(() => computeGroupStandings(matches), [matches])
  const goals = useGoldenBoot()
  const { data: bonus } = useBonus(user?.uid ?? null)
  const cfg = useAppConfig()

  const photoFor = (name: string, fallback?: string) => cfg.playerPhotos[name] || fallback
  const allPlayers = useMemo<PlayerOption[]>(() => {
    const hidden = new Set(cfg.hiddenScorers || [])
    return [
      ...TOP_SCORER_CANDIDATES,
      ...cfg.customPlayers.map<PlayerOption>((cp) => ({ name: cp.name, countryCode: cp.countryCode, display: `${cp.name} · ${cp.countryCode}` }))
    ].filter((p) => !hidden.has(p.name))
  }, [cfg.customPlayers, cfg.hiddenScorers])

  if (loading) {
    return (
      <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {[0, 1, 2].map((i) => <MatchCardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>נבחרות ובתים</h1>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          48 נבחרות · 12 בתים · הטבלה מתעדכנת לפי תוצאות. שתי הראשונות מכל בית עולות.
        </p>
      </div>

      <Link to="/bracket" className="glass card-3d" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', textDecoration: 'none', color: 'var(--color-text)'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 }}>
          <span style={{ fontSize: 20 }}>🏆</span> הדרך לגמר — טבלת הנוקאאוט
        </span>
        <span style={{ color: 'var(--color-primary)' }}>←</span>
      </Link>


      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
        {groups.map((g) => (
          <section key={g.group} className="card animate-in" style={{ padding: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18, marginBottom: 10 }}>
              בית {g.group}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 28px 34px 34px', gap: 6, fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, padding: '0 4px 6px' }}>
              <span />
              <span>נבחרת</span>
              <span style={{ textAlign: 'center' }}>מש׳</span>
              <span style={{ textAlign: 'center' }}>הפרש</span>
              <span style={{ textAlign: 'center' }}>נק׳</span>
            </div>
            {g.rows.map((r, i) => <Row key={r.team.code} r={r} rank={i + 1} />)}
          </section>
        ))}
      </div>

      {/* Live Golden Boot race (read-only — picking happens on the Bonus tab) */}
      <GoldenBootRace players={allPlayers} goals={goals} selected={bonus?.topScorer ?? null} photoFor={photoFor} mode="watch" />
    </div>
  )
}

function Row({ r, rank }: { r: TeamStanding; rank: number }) {
  const qualifies = rank <= 2
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 1fr 28px 34px 34px',
        gap: 6,
        alignItems: 'center',
        padding: '7px 4px',
        borderTop: '1px solid var(--glass-border)'
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 800, textAlign: 'center',
        color: qualifies ? 'var(--color-success)' : 'var(--color-text-muted)'
      }}>{rank}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <FlagIcon flag={r.team.flag} code={r.team.code} size={20} />
        <span style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.team.name}</span>
      </span>
      <span style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>{r.played}</span>
      <span style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
      <span style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>{r.points}</span>
    </div>
  )
}
