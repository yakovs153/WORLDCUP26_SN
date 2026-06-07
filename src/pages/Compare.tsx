import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { useAuth } from '../auth/AuthProvider'
import { useUserDoc } from '../hooks/useUserDoc'
import { useBonus } from '../hooks/useBonus'
import { usePredictions } from '../hooks/usePredictions'
import { useMatches } from '../hooks/useMatches'
import { useAppConfig } from '../hooks/useAppConfig'
import FlagIcon from '../components/FlagIcon'
import LiveBadge from '../components/LiveBadge'
import OctopusMark from '../components/OctopusMark'
import { MatchCardSkeleton } from '../components/Skeleton'
import { scorePredictionForStage } from '../lib/scoring'
import { tomPick, AUTO_FACTOR, OCTOPUS_UID, OCTOPUS_NAME, octopusEntry } from '../lib/octopus'
import { formatTimeHe, formatDateHe, stageLabel } from '../lib/format'
import type { Match, Prediction, ScoringConfig } from '../types'

/**
 * Head-to-head: me vs another participant (or Tom). Tap a leaderboard row to
 * land here. Bonus picks are hidden until the tournament starts (matches the
 * existing lock used everywhere else). Match predictions are hidden until each
 * specific match has kicked off — same privacy rule as MatchRoom.
 */
export default function Compare() {
  const { otherUid = '' } = useParams<{ otherUid: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const cfg = useAppConfig()
  const { matches } = useMatches()

  const myUid = user?.uid ?? null
  const isOtherTom = otherUid === OCTOPUS_UID
  const otherUidRef = isOtherTom ? null : otherUid

  const { data: myDoc } = useUserDoc(myUid)
  const { data: otherDoc } = useUserDoc(otherUidRef)
  const { data: myBonus } = useBonus(myUid)
  const { data: otherBonus } = useBonus(otherUidRef)
  const { byMatchId: myPreds } = usePredictions(myUid)
  const { byMatchId: otherPreds } = usePredictions(otherUidRef)

  // Bonus-reveal gate: read the global lock timestamp. Until then, hide the
  // other person's bonus picks (privacy).
  const [bonusLockedAtMs, setBonusLockedAtMs] = useState<number | null>(null)
  useEffect(() => {
    if (DEMO_MODE) return
    return onSnapshot(doc(db, 'appState', 'timing'), (s) => {
      const t = s.data()?.bonusLockAt
      setBonusLockedAtMs(t?.toMillis ? t.toMillis() : null)
    })
  }, [])
  const bonusRevealed = !bonusLockedAtMs || bonusLockedAtMs <= Date.now() || DEMO_MODE

  // Tom: synthesize from tomPick for each match. Bonus picks: N/A.
  const otherPredsResolved = useMemo<Record<string, Prediction | { homeScore: number; awayScore: number; auto: true; isTom: true }>>(() => {
    if (!isOtherTom) return otherPreds
    const map: Record<string, { homeScore: number; awayScore: number; auto: true; isTom: true }> = {}
    for (const m of matches) {
      if (m.status === 'SCHEDULED') continue
      const [h, a] = tomPick(m.homeTeam.code, m.awayTeam.code, m.id, cfg.analystOverrides)
      map[m.id] = { homeScore: h, awayScore: a, auto: true, isTom: true }
    }
    return map
  }, [isOtherTom, otherPreds, matches, cfg.analystOverrides])

  // Compose displayable rows: matches that have kicked off, where AT LEAST one
  // side has a prediction. Sorted newest first.
  const rows = useMemo(() => {
    return matches
      .filter((m) => m.status !== 'SCHEDULED')
      .map((m) => ({ m, mine: myPreds[m.id], theirs: otherPredsResolved[m.id] }))
      .filter((r) => r.mine || r.theirs)
      .sort((a, b) => b.m.kickoff.toMillis() - a.m.kickoff.toMillis())
  }, [matches, myPreds, otherPredsResolved])

  // Running points-from-revealed-matches tally — what we can prove HERE on this
  // page. (Total totals come from the user docs / synthesized for Tom.)
  const tally = useMemo(() => {
    let mine = 0, theirs = 0, myWins = 0, theirWins = 0
    for (const r of rows) {
      if (r.m.status !== 'FINISHED') continue
      const mp = pointsFor(r.mine, r.m, cfg)
      const tp = pointsFor(r.theirs, r.m, cfg)
      mine += mp
      theirs += tp
      if (mp > tp) myWins++
      else if (tp > mp) theirWins++
    }
    return { mine, theirs, myWins, theirWins }
  }, [rows, cfg])

  // Tom's totals: derived live from octopusEntry (he isn't a real user doc).
  const tomTotal = useMemo(
    () => isOtherTom ? octopusEntry(matches, cfg.scoring, undefined, cfg.analystOverrides).totalPoints : 0,
    [isOtherTom, matches, cfg.scoring, cfg.analystOverrides]
  )

  if (!myUid) return null
  if (otherUid === myUid) {
    navigate('/my', { replace: true })
    return null
  }

  const otherName = isOtherTom ? OCTOPUS_NAME : (otherDoc?.displayName || 'משתמש')
  const otherPhoto = isOtherTom ? null : otherDoc?.photoURL || null
  const otherTotal = isOtherTom ? tomTotal : (otherDoc?.totalPoints ?? 0)
  const myTotal = myDoc?.totalPoints ?? 0
  const ahead = myTotal === otherTotal ? null : myTotal > otherTotal ? 'me' : 'them'

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Link to="/leaderboard" className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '6px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text)' }}>← לטבלת הדירוג</Link>

      {/* Hero — versus card */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: 'var(--space-4)' }}>
        <Side name={myDoc?.displayName || 'אני'} photo={myDoc?.photoURL || null} points={myTotal} mePill ahead={ahead === 'me'} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-text-muted)' }}>VS</div>
        <Side name={otherName} photo={otherPhoto} points={otherTotal} ahead={ahead === 'them'} isTom={isOtherTom} />
      </div>

      {/* Quick stats */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', gap: 6, padding: 'var(--space-3)' }}>
        <Stat label="פער" value={Math.abs(myTotal - otherTotal)} highlight />
        <Stat label="ניצחונות שלך" value={tally.myWins} />
        <Stat label={isOtherTom ? 'ניצחונות טום' : 'ניצחונות שלו/ה'} value={tally.theirWins} />
      </div>

      {/* Bonus side-by-side (hidden until tournament starts; not applicable for Tom) */}
      {!isOtherTom && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 'var(--space-4)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18 }}>🏆 ניחושי הבונוס</h2>
          {!bonusRevealed ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              🔒 ייחשפו עם פתיחת המשחק הראשון בטורניר.
            </p>
          ) : (
            <>
              <BonusRow label="🏆 זוכה" mine={myBonus?.championTeamCode} theirs={otherBonus?.championTeamCode} matches={matches} />
              <BonusRow label="🥈 סגנית" mine={myBonus?.runnerUpCode} theirs={otherBonus?.runnerUpCode} matches={matches} />
              <BonusRow label="🐎 הפתעה" mine={myBonus?.surpriseTeamCode} theirs={otherBonus?.surpriseTeamCode} matches={matches} />
              <BonusRow label="📉 אכזבה" mine={myBonus?.flopTeamCode} theirs={otherBonus?.flopTeamCode} matches={matches} />
              <BonusRow label="⚽ מלך שערים" mineText={myBonus?.topScorer} theirsText={otherBonus?.topScorer} />
            </>
          )}
        </section>
      )}

      {/* Match-by-match */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, fontSize: 18 }}>⚽ ראש בראש לפי משחק</h2>
        {!matches.length ? (
          <MatchCardSkeleton />
        ) : rows.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>אין עדיין משחקים שהחלו להשוואה.</p>
        ) : (
          rows.map((r) => <MatchCompareRow key={r.m.id} match={r.m} mine={r.mine} theirs={r.theirs} cfg={cfg} />)
        )}
      </section>
    </div>
  )
}

function Side({ name, photo, points, mePill, ahead, isTom }: { name: string; photo: string | null; points: number; mePill?: boolean; ahead?: boolean; isTom?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {isTom ? (
        <OctopusMark size={56} />
      ) : photo ? (
        <img src={photo} width={56} height={56} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: ahead ? '2px solid var(--color-primary)' : '2px solid transparent' }} alt="" />
      ) : (
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-primary)', color: 'var(--color-on-primary)', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 900, border: ahead ? '2px solid var(--color-primary)' : '2px solid transparent' }}>
          {(name || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ fontWeight: 800, fontSize: 14, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
        {name}
        {mePill && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-on-primary)', background: 'var(--color-primary)', padding: '2px 7px', borderRadius: 'var(--radius-full)' }}>אתה</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: ahead ? 'var(--color-primary)' : 'var(--color-text)' }}>{points}</div>
      <div className="text-muted" style={{ fontSize: 10, marginTop: -4 }}>נקודות</div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: highlight ? 'var(--color-primary)' : 'var(--color-text)' }}>{value}</div>
      <div className="text-muted" style={{ fontSize: 11 }}>{label}</div>
    </div>
  )
}

function BonusRow({
  label, mine, theirs, mineText, theirsText, matches
}: {
  label: string
  mine?: string | null
  theirs?: string | null
  mineText?: string | null
  theirsText?: string | null
  matches?: Match[]
}) {
  // For team-based picks we resolve the team metadata once.
  const teamByCode = useMemo(() => {
    const map = new Map<string, { name: string; flag: string; code: string }>()
    if (!matches) return map
    for (const m of matches) {
      if (!map.has(m.homeTeam.code)) map.set(m.homeTeam.code, m.homeTeam)
      if (!map.has(m.awayTeam.code)) map.set(m.awayTeam.code, m.awayTeam)
    }
    return map
  }, [matches])

  const mineTeam = mine ? teamByCode.get(mine) : null
  const theirsTeam = theirs ? teamByCode.get(theirs) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
      <Pick team={mineTeam} text={mineText} />
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</span>
      <Pick team={theirsTeam} text={theirsText} align="end" />
    </div>
  )
}

function Pick({ team, text, align = 'start' }: { team?: { name: string; flag: string; code: string } | null; text?: string | null; align?: 'start' | 'end' }) {
  if (team) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: align === 'end' ? 'flex-end' : 'flex-start' }}>
        <FlagIcon flag={team.flag} code={team.code} size={20} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{team.name}</span>
      </div>
    )
  }
  if (text) return <div style={{ fontSize: 13, fontWeight: 700, textAlign: align === 'end' ? 'right' : 'left' }}>{text}</div>
  return <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: align === 'end' ? 'right' : 'left' }}>—</div>
}

interface Cfg {
  scoring: ScoringConfig
}

function pointsFor(pred: Prediction | { homeScore: number; awayScore: number; auto?: boolean; points?: number | null } | undefined, m: Match, cfg: Cfg): number {
  if (!pred) return 0
  if (m.status !== 'FINISHED' || m.homeScore == null || m.awayScore == null) return 0
  // Cached points on the doc win when present.
  if ('points' in pred && typeof pred.points === 'number') return pred.points
  const base = scorePredictionForStage(pred.homeScore, pred.awayScore, m.homeScore, m.awayScore, m.stage, cfg.scoring)
  return Math.round(base * (pred.auto ? AUTO_FACTOR : 1))
}

function MatchCompareRow({ match, mine, theirs, cfg }: { match: Match; mine?: Prediction; theirs?: Prediction | { homeScore: number; awayScore: number; auto?: boolean }; cfg: Cfg }) {
  const myPts = pointsFor(mine, match, cfg)
  const theirPts = pointsFor(theirs, match, cfg)
  const winner = myPts === theirPts ? 'tie' : myPts > theirPts ? 'me' : 'them'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 4px', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
        <span>{stageLabel(match.stage, match.group)} · {formatDateHe(match.kickoff.toDate())} {formatTimeHe(match.kickoff.toDate())}</span>
        {match.status === 'LIVE' ? <LiveBadge status="LIVE" /> : null}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-start' }}>
          <FlagIcon flag={match.homeTeam.flag} code={match.homeTeam.code} size={18} />
          <span style={{ fontWeight: 700 }}>{match.homeTeam.name}</span>
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
          {match.homeScore ?? '–'} : {match.awayScore ?? '–'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 700 }}>{match.awayTeam.name}</span>
          <FlagIcon flag={match.awayTeam.flag} code={match.awayTeam.code} size={18} />
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
        <PredCell label="הניחוש שלך" pred={mine} highlight={winner === 'me'} points={match.status === 'FINISHED' ? myPts : null} />
        <PredCell label="שלו/ה" pred={theirs} highlight={winner === 'them'} points={match.status === 'FINISHED' ? theirPts : null} align="end" />
      </div>
    </div>
  )
}

function PredCell({ label, pred, highlight, points, align = 'start' }: { label: string; pred?: { homeScore: number; awayScore: number; auto?: boolean }; highlight?: boolean; points: number | null; align?: 'start' | 'end' }) {
  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 'var(--radius-md)',
      background: highlight ? 'color-mix(in srgb, var(--color-primary) 16%, transparent)' : 'var(--color-bg-elevated)',
      border: highlight ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
      textAlign: align === 'end' ? 'right' : 'left'
    }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700 }}>{label}</div>
      {pred ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: align === 'end' ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{pred.homeScore} - {pred.awayScore}</span>
          {pred.auto && <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>🤖</span>}
          {points !== null && <span style={{ fontSize: 12, fontWeight: 800, color: points > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{points} נק׳</span>}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>לא ניחש</div>
      )}
    </div>
  )
}
