import { useMemo } from 'react'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { useBonus } from '../hooks/useBonus'
import { useAuth } from '../auth/AuthProvider'
import { Link } from 'react-router-dom'
import MatchCard from '../components/MatchCard'
import NextMatchHero from '../components/NextMatchHero'
import LiveStrip from '../components/LiveStrip'
import PrizeCard from '../components/PrizeCard'
import KingBanner from '../components/KingBanner'
import PunditCard from '../components/PunditCard'
import { MatchCardSkeleton } from '../components/Skeleton'
import { useAppConfig } from '../hooks/useAppConfig'
import { dateKey, formatDateHe } from '../lib/format'
import { tipOfTheDay } from '../lib/tips'
import type { Match } from '../types'

export default function Matches() {
  const { user } = useAuth()
  const cfg = useAppConfig()
  const { matches, loading } = useMatches()
  const { byMatchId } = usePredictions(user?.uid ?? null)
  const { data: bonus } = useBonus(user?.uid ?? null)

  const grouped = useMemo(() => groupByDate(matches), [matches])

  // Nudge: scheduled matches the user hasn't predicted yet within the next
  // 3 days, split by day (today / tomorrow / day-after) so the banner can be
  // specific about both the count and the window. Matches the 3-day window
  // used by the bottom-nav red dot.
  const unpredicted = useMemo(() => {
    const now = Date.now()
    const HOUR = 3_600_000
    let today = 0, tomorrow = 0, later = 0
    for (const m of matches) {
      if (m.status !== 'SCHEDULED') continue
      if (byMatchId[m.id]) continue
      const hoursAhead = (m.kickoff.toMillis() - now) / HOUR
      if (hoursAhead <= 0) continue
      if (hoursAhead < 24) today++
      else if (hoursAhead < 48) tomorrow++
      else if (hoursAhead < 72) later++
    }
    return { today, tomorrow, later, total: today + tomorrow + later }
  }, [matches, byMatchId])

  const nextMatch = useMemo(() => {
    const now = Date.now()
    return (
      matches.find((m) => m.status === 'SCHEDULED' && m.kickoff.toMillis() > now) ?? null
    )
  }, [matches])

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
      <LiveStrip />
      {unpredicted.total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-accent) 18%, var(--color-bg-elevated))', border: '1px solid color-mix(in srgb, var(--color-accent) 50%, var(--color-border-strong))', fontSize: 14 }}>
          <div style={{ fontWeight: 800 }}>
            ⏰ {unpredicted.total === 1 ? 'משחק אחד ממתין לניחוש' : `${unpredicted.total} משחקים ממתינים לניחוש`} ב-3 הימים הקרובים
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>
            {(() => {
              const parts: string[] = []
              if (unpredicted.today > 0) parts.push(`היום ${unpredicted.today}`)
              if (unpredicted.tomorrow > 0) parts.push(`מחר ${unpredicted.tomorrow}`)
              if (unpredicted.later > 0) parts.push(`מחרתיים ${unpredicted.later}`)
              return `${parts.join(' · ')} — אל תיתן לרובי לנחש במקומך!`
            })()}
          </div>
        </div>
      )}
      <PrizeCard />
      {nextMatch && <NextMatchHero match={nextMatch} />}

      <KingBanner />

      <PunditCard />

      {cfg.tipsEnabled && (
        <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <span style={{ fontSize: 22 }}>💡</span>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>טיפ היום</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{tipOfTheDay(cfg.tips)}</div>
          </div>
        </div>
      )}

      {needsBonus && (
        <Link
          to="/bonus#empty"
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
                  <MatchCard match={m} prediction={byMatchId[m.id]} uid={user!.uid} />
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
