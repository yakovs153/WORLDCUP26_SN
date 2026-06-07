import { useMemo } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import FlagIcon from '../components/FlagIcon'
import LiveBadge from '../components/LiveBadge'
import PointsChart from '../components/PointsChart'
import MyPicksSubTabs from '../components/MyPicksSubTabs'
import { MatchCardSkeleton } from '../components/Skeleton'
import { formatTimeHe, formatDateHe, stageLabel } from '../lib/format'

export default function MyPredictions() {
  const { user } = useAuth()
  const { matches, loading: lm } = useMatches()
  const { byMatchId, loading: lp } = usePredictions(user?.uid ?? null)

  const rows = useMemo(() => {
    return matches
      .filter((m) => byMatchId[m.id])
      .sort((a, b) => b.kickoff.toMillis() - a.kickoff.toMillis())
  }, [matches, byMatchId])

  // Cumulative points over time across finished matches (chronological).
  // Must be declared BEFORE any conditional return to respect Rules of Hooks.
  const chartPoints = useMemo(() => {
    const finished = rows
      .filter((m) => m.status === 'FINISHED')
      .slice()
      .sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())
    let cum = 0
    return finished.map((m) => {
      cum += byMatchId[m.id]?.points ?? 0
      return { x: m.kickoff.toMillis(), y: cum }
    })
  }, [rows, byMatchId])

  if (lm || lp)
    return (
      <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>הניחושים שלי</h1>
        <MyPicksSubTabs />
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
    )

  const totalPoints = rows.reduce((s, m) => s + (byMatchId[m.id]?.points ?? 0), 0)
  const finishedCount = rows.filter((m) => m.status === 'FINISHED').length

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>הניחושים שלי</h1>
      <MyPicksSubTabs />

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', gap: 8 }}>
        <Stat label="ניחושים" value={rows.length} />
        <Stat label="הסתיימו" value={finishedCount} />
        <Stat label="נקודות" value={totalPoints} highlight />
      </div>

      <div className="card animate-in">
        <h2 style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 8 }}>
          התקדמות הנקודות
        </h2>
        <PointsChart points={chartPoints} />
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <p className="text-muted">עוד לא הזנת ניחושים. עבור לכרטיסיית "משחקים" כדי להתחיל.</p>
        </div>
      ) : (
        rows.map((m) => {
          const p = byMatchId[m.id]
          return (
            <div className="card animate-in" key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-muted)' }}>
                <span>{stageLabel(m.stage, m.group)} · {formatDateHe(m.kickoff.toDate())} {formatTimeHe(m.kickoff.toDate())}</span>
                <LiveBadge status={m.status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                <TeamRow team={m.homeTeam} />
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>ניחוש</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{p.homeScore} - {p.awayScore}</div>
                  {m.status !== 'SCHEDULED' && (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>בפועל</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: m.status === 'LIVE' ? 'var(--color-danger)' : 'var(--color-text)' }}>
                        {m.homeScore ?? 0} - {m.awayScore ?? 0}
                      </div>
                    </>
                  )}
                </div>
                <TeamRow team={m.awayTeam} align="end" />
              </div>
              {m.status === 'FINISHED' && (
                <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {p.points ?? 0} נק'
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function TeamRow({ team, align = 'start' }: { team: { name: string; code: string; flag: string }; align?: 'start' | 'end' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'end' ? 'flex-end' : 'flex-start', gap: 4 }}>
      <FlagIcon flag={team.flag} code={team.code} size={28} />
      <div style={{ fontSize: 13, fontWeight: 600 }}>{team.name}</div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28,
        color: highlight ? 'var(--color-primary)' : 'var(--color-text)'
      }}>{value}</div>
      <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
    </div>
  )
}
