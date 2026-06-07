import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Match, Prediction } from '../types'
import FlagIcon from './FlagIcon'
import LiveBadge from './LiveBadge'
import ScoreInput from './ScoreInput'
import CubeMark from './CubeMark'
import { savePrediction } from '../lib/predictions'
import { formatTimeHe, stageLabel } from '../lib/format'
import { useToast } from './Toast'
import { scorePrediction, applyStage } from '../lib/scoring'
import { useAppConfig } from '../hooks/useAppConfig'
import { ringColors } from '../lib/players'
import { fireConfetti } from '../lib/confetti'
import { tomPick, AUTO_FACTOR } from '../lib/octopus'

interface Props {
  match: Match
  prediction?: Prediction
  uid: string
}

type Backed = 'home' | 'away' | null

export default function MatchCard({ match, prediction, uid }: Props) {
  const [home, setHome] = useState<number | null>(prediction?.homeScore ?? null)
  const [away, setAway] = useState<number | null>(prediction?.awayScore ?? null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const cfg = useAppConfig()
  const navigate = useNavigate()

  useEffect(() => {
    setHome(prediction?.homeScore ?? null)
    setAway(prediction?.awayScore ?? null)
  }, [prediction?.homeScore, prediction?.awayScore])

  const kickoff = match.kickoff.toDate()
  // Locked once the match isn't scheduled OR kickoff is within 5 minutes — whichever
  // comes first. The 5-minute buffer prevents last-second edits and closes the gap
  // before the sync flips status to LIVE.
  const LOCK_LEAD_MS = 5 * 60 * 1000
  const locked = match.status !== 'SCHEDULED' || Date.now() >= kickoff.getTime() - LOCK_LEAD_MS
  const dirty =
    !locked &&
    home !== null &&
    away !== null &&
    (home !== (prediction?.homeScore ?? -1) || away !== (prediction?.awayScore ?? -1))

  const handleSave = async () => {
    if (home === null || away === null) return
    setSaving(true)
    setError(null)
    try {
      await savePrediction(uid, match.id, home, away)
      setSavedAt(Date.now())
      toast.show(`נשמר ✓  ${match.homeTeam.code} ${home} - ${away} ${match.awayTeam.code}`)
      setTimeout(() => setSavedAt(null), 2000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'שמירה נכשלה'
      setError(msg)
      toast.show(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Which team did the user back to win? (drives the gradient ring)
  const backed: Backed =
    prediction && prediction.homeScore !== prediction.awayScore
      ? prediction.homeScore > prediction.awayScore ? 'home' : 'away'
      : null

  // Points the prediction is worth given the current (live or final) score.
  const scoreKnown = match.homeScore !== null && match.awayScore !== null
  const potential =
    prediction && scoreKnown
      ? prediction.points ?? Math.round(applyStage(scorePrediction(prediction.homeScore, prediction.awayScore, match.homeScore!, match.awayScore!, cfg.scoring), match.stage, cfg.stageMultipliers) * (prediction.auto ? AUTO_FACTOR : 1))
      : null

  // Confetti once when a finished match rewards the user.
  const celebrated = useRef(false)
  useEffect(() => {
    if (match.status === 'FINISHED' && (potential ?? 0) > 0 && !celebrated.current) {
      celebrated.current = true
      fireConfetti()
    }
  }, [match.status, potential])

  const homeRing = ringColors(match.homeTeam.code)
  const awayRing = ringColors(match.awayTeam.code)

  return (
    <div
      className="card card-3d match-card"
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0,
        background: `linear-gradient(135deg, color-mix(in srgb, ${homeRing.a} 9%, var(--color-surface)) 0%, var(--color-surface) 45%, color-mix(in srgb, ${awayRing.a} 9%, var(--color-surface)) 100%)`
      }}
    >
      {/* Header strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          background: 'var(--glass-bg-hi)',
          borderBottom: '1px solid var(--glass-border)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          fontWeight: 700,
          letterSpacing: 0.3
        }}
      >
        <span>{stageLabel(match.stage, match.group)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to={`/match/${match.id}`} title="חדר משחק" style={{ textDecoration: 'none', fontSize: 14 }}>💬</Link>
          {match.status === 'SCHEDULED' ? (
            <span style={{ color: 'var(--color-text)' }}>{formatTimeHe(kickoff)}</span>
          ) : (
            <LiveBadge status={match.status} />
          )}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          onClick={() => navigate(`/match/${match.id}`)}
          title="פתח חדר משחק וניחושים"
          style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <TeamSide team={match.homeTeam} backed={backed === 'home'} />
          <CenterScore match={match} locked={locked} />
          <TeamSide team={match.awayTeam} backed={backed === 'away'} />
        </div>

        {match.status !== 'SCHEDULED' && match.scorers && match.scorers.length > 0 && (
          <ScorersRow scorers={match.scorers} homeCode={match.homeTeam.code} />
        )}

        {/* Live points-in-flight */}
        {match.status === 'LIVE' && prediction && potential !== null && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span className="points-flight bump" key={potential}>
              🎯 {potential > 0 ? `+${potential} בדרך!` : 'עוד אין נקודות'}
            </span>
          </div>
        )}

        {/* Prediction inputs row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 12,
            background: 'var(--glass-bg-hi)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ScoreInput value={home} onChange={setHome} disabled={locked} ariaLabel={`ניחוש שערים ל-${match.homeTeam.name}`} />
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textAlign: 'center' }}>
            הניחוש שלי
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ScoreInput value={away} onChange={setAway} disabled={locked} ariaLabel={`ניחוש שערים ל-${match.awayTeam.name}`} />
          </div>
        </div>

        {!locked && (
          <button className="btn btn-block" disabled={!dirty || saving || home === null || away === null} onClick={handleSave}>
            {saving ? 'שומר…' : savedAt ? 'נשמר ✓' : prediction ? 'עדכון ניחוש' : 'שמירת ניחוש'}
          </button>
        )}

        {locked && prediction && (
          <ResultBadge myHome={prediction.homeScore} myAway={prediction.awayScore} points={potential} isLive={match.status === 'LIVE'} wrong={match.status === 'FINISHED' && (potential ?? 0) === 0} />
        )}

        {locked && prediction?.auto && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
            🤖 טום האנליסט ניחש בשבילך · 50% מהנקודות
          </div>
        )}

        {locked && !prediction && (() => {
          const [oh, oa] = tomPick(match.homeTeam.code, match.awayTeam.code, match.id, cfg.analystOverrides)
          const octoPts = scoreKnown ? Math.round(applyStage(scorePrediction(oh, oa, match.homeScore!, match.awayScore!, cfg.scoring), match.stage, cfg.stageMultipliers) * AUTO_FACTOR) : null
          return (
            <>
              <ResultBadge myHome={oh} myAway={oa} points={octoPts} isLive={match.status === 'LIVE'} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                🤖 שכחת לנחש — טום האנליסט ניחש בשבילך · 50% מהנקודות
              </div>
            </>
          )
        })()}

        {error && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  )
}

function TeamSide({ team, backed }: { team: { name: string; code: string; flag: string }; backed: boolean }) {
  const ring = ringColors(team.code)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {backed ? (
        <span className="team-ring" style={{ ['--ring-a' as string]: ring.a, ['--ring-b' as string]: ring.b }} title="הימרת על הניצחון שלהם">
          <span style={{ display: 'flex' }}>
            <FlagIcon flag={team.flag} code={team.code} size={38} />
          </span>
        </span>
      ) : (
        <FlagIcon flag={team.flag} code={team.code} size={42} />
      )}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.15 }}>{team.name}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: 1, marginTop: 2 }}>{team.code}</div>
      </div>
    </div>
  )
}

function CenterScore({ match, locked }: { match: Match; locked: boolean }) {
  if (!locked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 50 }}>
        <CubeMark size={22} />
        <span style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>VS</span>
      </div>
    )
  }
  const live = match.status === 'LIVE'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 78 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 1,
          color: live ? 'var(--color-primary)' : 'var(--color-text)',
          textShadow: live ? '0 0 18px rgba(225,29,72,0.45)' : 'none',
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }}
      >
        {match.homeScore ?? 0}<span style={{ opacity: 0.4 }}> : </span>{match.awayScore ?? 0}
      </div>
      {live && match.minute != null && (
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)' }}>{match.minute}'</span>
      )}
    </div>
  )
}

function ScorersRow({ scorers, homeCode }: { scorers: NonNullable<Match['scorers']>; homeCode: string }) {
  if (!scorers.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
      {scorers.map((s, i) => (
        <span key={i} style={{ whiteSpace: 'nowrap' }}>
          {s.team === homeCode ? '' : ''}⚽ {s.name}{s.minute != null ? ` ${s.minute}'` : ''}
        </span>
      ))}
    </div>
  )
}

function ResultBadge({ myHome, myAway, points, isLive, wrong }: { myHome: number; myAway: number; points: number | null | undefined; isLive: boolean; wrong?: boolean }) {
  const good = (points ?? 0) > 0
  return (
    <div
      className={wrong ? 'shake' : undefined}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        background: 'var(--glass-bg-hi)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)',
        fontSize: 13
      }}
    >
      <span className="text-muted">
        ניחשת <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>{myHome} - {myAway}</span>
      </span>
      {points !== null && points !== undefined && (
        good ? (
          <span className="points-flight">{isLive ? 'צפוי ' : ''}+{points} נק׳</span>
        ) : (
          <span style={{ fontWeight: 800, color: 'var(--color-text-muted)' }}>{isLive ? 'צפוי ' : ''}0 נק׳</span>
        )
      )}
    </div>
  )
}
