import { useEffect, useState } from 'react'
import type { Match, Prediction } from '../types'
import FlagIcon from './FlagIcon'
import LiveBadge from './LiveBadge'
import ScoreInput from './ScoreInput'
import { savePrediction } from '../lib/predictions'
import { formatTimeHe, stageLabel } from '../lib/format'
import { useToast } from './Toast'
import { scorePrediction } from '../lib/scoring'
import { useAppConfig } from '../hooks/useAppConfig'

interface Props {
  match: Match
  prediction?: Prediction
  uid: string
}

export default function MatchCard({ match, prediction, uid }: Props) {
  const [home, setHome] = useState<number | null>(prediction?.homeScore ?? null)
  const [away, setAway] = useState<number | null>(prediction?.awayScore ?? null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const cfg = useAppConfig()

  useEffect(() => {
    setHome(prediction?.homeScore ?? null)
    setAway(prediction?.awayScore ?? null)
  }, [prediction?.homeScore, prediction?.awayScore])

  const locked = match.status !== 'SCHEDULED'
  const kickoff = match.kickoff.toDate()
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

  const points = prediction?.points
  const livePotential =
    !locked && home !== null && away !== null
      ? null
      : prediction && match.homeScore !== null && match.awayScore !== null
        ? scorePrediction(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore, cfg.scoring)
        : null

  return (
    <div
      className="card match-card"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        overflow: 'hidden',
        padding: 0
      }}
    >
      {/* Header strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          background: 'var(--color-bg-elevated)',
          borderBottom: '1px solid var(--color-border)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          fontWeight: 700,
          letterSpacing: 0.3
        }}
      >
        <span>{stageLabel(match.stage, match.group)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {match.status === 'SCHEDULED' ? (
            <span style={{ color: 'var(--color-text)' }}>{formatTimeHe(kickoff)}</span>
          ) : (
            <LiveBadge status={match.status} />
          )}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Teams + center score */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 12
          }}
        >
          <TeamSide team={match.homeTeam} />
          <CenterScore match={match} locked={locked} />
          <TeamSide team={match.awayTeam} />
        </div>

        {/* Prediction inputs row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 12,
            background: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ScoreInput
              value={home}
              onChange={setHome}
              disabled={locked}
              ariaLabel={`ניחוש שערים ל-${match.homeTeam.name}`}
            />
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textAlign: 'center' }}>
            הניחוש שלי
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ScoreInput
              value={away}
              onChange={setAway}
              disabled={locked}
              ariaLabel={`ניחוש שערים ל-${match.awayTeam.name}`}
            />
          </div>
        </div>

        {/* Action row */}
        {!locked && (
          <button
            className="btn btn-block"
            disabled={!dirty || saving || home === null || away === null}
            onClick={handleSave}
          >
            {saving ? 'שומר…' : savedAt ? 'נשמר ✓' : prediction ? 'עדכון ניחוש' : 'שמירת ניחוש'}
          </button>
        )}

        {locked && prediction && (
          <ResultBadge
            myHome={prediction.homeScore}
            myAway={prediction.awayScore}
            points={points ?? livePotential}
            isLive={match.status === 'LIVE'}
          />
        )}

        {locked && !prediction && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-muted)',
              fontSize: 13,
              textAlign: 'center'
            }}
          >
            לא הוזן ניחוש למשחק זה
          </div>
        )}

        {error && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  )
}

function TeamSide({ team }: { team: { name: string; code: string; flag: string } }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8
      }}
    >
      <FlagIcon flag={team.flag} code={team.code} size={42} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.15 }}>{team.name}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: 1, marginTop: 2 }}>
          {team.code}
        </div>
      </div>
    </div>
  )
}

function CenterScore({ match, locked }: { match: Match; locked: boolean }) {
  if (!locked) {
    return (
      <div
        style={{
          minWidth: 50,
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          fontWeight: 700
        }}
      >
        VS
      </div>
    )
  }
  return (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 32,
        fontWeight: 900,
        letterSpacing: 1,
        color: match.status === 'LIVE' ? 'var(--color-danger)' : 'var(--color-text)',
        minWidth: 70,
        textAlign: 'center',
        whiteSpace: 'nowrap'
      }}
    >
      {match.homeScore ?? 0} - {match.awayScore ?? 0}
    </div>
  )
}

function ResultBadge({
  myHome,
  myAway,
  points,
  isLive
}: {
  myHome: number
  myAway: number
  points: number | null | undefined
  isLive: boolean
}) {
  const ptsColor = points && points > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-md)',
        fontSize: 13
      }}
    >
      <span className="text-muted">
        ניחשת <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>{myHome} - {myAway}</span>
      </span>
      {points !== null && points !== undefined && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: ptsColor }}>
          {isLive && <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>צפוי</span>}
          {points > 0 ? `+${points} נק'` : '0 נק'}
        </span>
      )}
    </div>
  )
}
