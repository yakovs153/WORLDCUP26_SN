import { useMemo } from 'react'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { useBonus } from '../hooks/useBonus'
import { useAuth } from '../auth/AuthProvider'
import { Link } from 'react-router-dom'
import MatchCard from '../components/MatchCard'
import NextMatchHero from '../components/NextMatchHero'
import PollCard from '../components/PollCard'
import { MatchCardSkeleton } from '../components/Skeleton'
import { useAppConfig } from '../hooks/useAppConfig'
import { dateKey, formatDateHe } from '../lib/format'
import { setJoker } from '../lib/jokers'
import type { Match } from '../types'

export default function Matches() {
  const { user } = useAuth()
  const cfg = useAppConfig()
  const { matches, loading } = useMatches()
  const { byMatchId } = usePredictions(user?.uid ?? null)
  const { data: bonus } = useBonus(user?.uid ?? null)

  const grouped = useMemo(() => groupByDate(matches), [matches])
  const activePolls = useMemo(() => cfg.polls.filter((p) => p.active), [cfg.polls])
  const activeSurveys = useMemo(() => cfg.surveys.filter((s) => s.active && s.questions.length > 0), [cfg.surveys])

  const nextMatch = useMemo(() => {
    const now = Date.now()
    return (
      matches.find((m) => m.status === 'SCHEDULED' && m.kickoff.toMillis() > now) ?? null
    )
  }, [matches])

  // Joker: one per matchday (calendar day). Arming clears any other Joker that day.
  const toggleJoker = async (match: Match) => {
    if (!user) return
    const pred = byMatchId[match.id]
    if (!pred) return
    const turningOn = !pred.joker
    if (turningOn) {
      const dk = dateKey(match.kickoff.toDate())
      for (const m of matches) {
        if (m.id !== match.id && dateKey(m.kickoff.toDate()) === dk && byMatchId[m.id]?.joker) {
          await setJoker(user.uid, m.id, false)
        }
      }
    }
    await setJoker(user.uid, match.id, turningOn)
  }

  if (loading)
    return (
      <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {[0, 1, 2].map((i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    )
  if (matches.length === 0)
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <h3>אין עדיין משחקים</h3>
        <p className="text-muted" style={{ marginTop: 8 }}>
          לוח המשחקים יסונכרן באופן אוטומטי ברגע שיופעלו ה-Cloud Functions.
        </p>
      </div>
    )

  const needsBonus = !bonus?.championTeamCode || !bonus?.topScorer

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {cfg.content.prize && (
        <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <span style={{ fontSize: 24 }}>🎁</span>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>הפרס</div>
            <div style={{ fontWeight: 800 }}>{cfg.content.prize}</div>
          </div>
        </div>
      )}
      {nextMatch && <NextMatchHero match={nextMatch} />}

      {activePolls.map((p) => (
        <PollCard key={p.id} poll={p} />
      ))}

      {activeSurveys.map((s) => (
        <Link
          key={s.id}
          to={`/survey/${s.id}`}
          className="glass animate-in"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📋</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>סקר · {s.questions.length} שאלות</div>
              <div style={{ fontWeight: 800 }}>{s.title}</div>
            </div>
          </div>
          <span style={{ fontSize: 20, color: 'var(--color-primary)' }}>←</span>
        </Link>
      ))}

      {needsBonus && (
        <Link
          to="/bonus"
          className="animate-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'color-mix(in srgb, var(--color-primary) 18%, var(--color-bg-elevated))',
            border: '1px solid color-mix(in srgb, var(--color-primary) 50%, var(--color-border-strong))',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            textDecoration: 'none',
            fontWeight: 700
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <span>
              השלם את ניחושי הבונוס
              <span className="text-muted" style={{ fontWeight: 500, fontSize: 12, marginInlineStart: 8 }}>
                זוכה ומלך שערים · עד 35 נק'
              </span>
            </span>
          </span>
          <span style={{ color: 'var(--color-primary)' }}>←</span>
        </Link>
      )}

      {grouped.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>אין משחקים להצגה</div>
      ) : (
        grouped.map((group) => (
          <section key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 700 }}>
              {formatDateHe(group.date)}
            </h2>
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {group.matches.map((m) => (
                <div key={m.id} className="animate-in">
                  <MatchCard match={m} prediction={byMatchId[m.id]} uid={user!.uid} onToggleJoker={() => toggleJoker(m)} />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function groupByDate(matches: Match[]): { key: string; date: Date; matches: Match[] }[] {
  const map = new Map<string, { date: Date; matches: Match[] }>()
  for (const m of matches) {
    const d = m.kickoff.toDate()
    const k = dateKey(d)
    if (!map.has(k)) map.set(k, { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), matches: [] })
    map.get(k)!.matches.push(m)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, date: v.date, matches: v.matches }))
}
