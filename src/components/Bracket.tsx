import type { Match, MatchStage, Prediction } from '../types'
import FlagIcon from './FlagIcon'
import LiveBadge from './LiveBadge'
import { formatTimeHe, stageLabel } from '../lib/format'

interface Props {
  matches: Match[]
  predictions: Record<string, Prediction>
}

const STAGE_ORDER: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'TP', 'F']

export default function Bracket({ matches, predictions }: Props) {
  // group knockout matches by stage
  const byStage = new Map<MatchStage, Match[]>()
  for (const m of matches) {
    if (m.stage === 'GROUP') continue
    const arr = byStage.get(m.stage) || []
    arr.push(m)
    byStage.set(m.stage, arr)
  }
  for (const arr of byStage.values()) {
    arr.sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())
  }

  const stages = STAGE_ORDER.filter((s) => byStage.has(s))

  if (stages.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <h3 style={{ marginBottom: 8 }}>הבראקט עוד לא זמין</h3>
        <p className="text-muted" style={{ fontSize: 13 }}>
          תצוגה זו תופיע כשמשחקי הנוקאאוט יתחילו.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        marginInline: 'calc(var(--space-4) * -1)',
        paddingInline: 'var(--space-4)',
        paddingBottom: 8
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          minWidth: 'fit-content',
          alignItems: 'stretch'
        }}
      >
        {stages.map((stage) => {
          const list = byStage.get(stage) || []
          return (
            <div
              key={stage}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                width: 220,
                flex: '0 0 auto'
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: 1,
                  fontSize: 14,
                  color: 'var(--color-text-muted)',
                  padding: '6px 8px',
                  background: 'var(--glass-bg-hi)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                {stageLabel(stage)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'space-around' }}>
                {list.map((m) => (
                  <BracketCard key={m.id} match={m} prediction={predictions[m.id]} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BracketCard({ match, prediction }: { match: Match; prediction?: Prediction }) {
  const locked = match.status !== 'SCHEDULED'
  return (
    <div
      className="glass"
      style={{
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative'
      }}
    >
      <div style={{ position: 'absolute', top: 8, left: 8 }}>
        {locked ? (
          <LiveBadge status={match.status} />
        ) : (
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{formatTimeHe(match.kickoff.toDate())}</span>
        )}
      </div>
      <TeamRow team={match.homeTeam} score={match.homeScore} locked={locked} winner={isWinner(match, 'home')} />
      <TeamRow team={match.awayTeam} score={match.awayScore} locked={locked} winner={isWinner(match, 'away')} />

      {prediction && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            paddingTop: 4,
            borderTop: '1px dashed var(--color-border)'
          }}
        >
          ניחוש: <span style={{ color: 'var(--color-text)' }}>{prediction.homeScore}-{prediction.awayScore}</span>
          {prediction.points !== null && prediction.points !== undefined && (
            <span style={{ marginInlineStart: 6, color: 'var(--color-primary)', fontWeight: 800 }}>+{prediction.points}</span>
          )}
        </div>
      )}
    </div>
  )
}

function isWinner(match: Match, side: 'home' | 'away'): boolean {
  if (match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) return false
  if (match.homeScore === match.awayScore) return false
  return side === 'home' ? match.homeScore > match.awayScore : match.awayScore > match.homeScore
}

function TeamRow({
  team,
  score,
  locked,
  winner
}: {
  team: { name: string; code: string; flag: string }
  score: number | null
  locked: boolean
  winner: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 4px',
        opacity: locked && !winner && score !== null ? 0.55 : 1
      }}
    >
      {team.name ? (
        <FlagIcon flag={team.flag} code={team.code} size={20} />
      ) : (
        <span style={{ width: 30, height: 20, borderRadius: 4, background: 'var(--glass-bg-hi)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>?</span>
      )}
      <span style={{ flex: 1, fontSize: 13, fontWeight: winner ? 800 : 600, color: winner ? 'var(--color-primary)' : team.name ? 'inherit' : 'var(--color-text-muted)' }}>
        {team.name || 'להיקבע'}
      </span>
      {locked && score !== null && (
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: winner ? 'var(--color-primary)' : 'var(--color-text)' }}>
          {score}
        </span>
      )}
    </div>
  )
}
