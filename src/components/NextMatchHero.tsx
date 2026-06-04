import { useEffect, useState } from 'react'
import type { Match } from '../types'
import FlagIcon from './FlagIcon'
import { stageLabel } from '../lib/format'

interface Props {
  match: Match | null
}

export default function NextMatchHero({ match }: Props) {
  const [remaining, setRemaining] = useState<string>('')

  useEffect(() => {
    if (!match) return
    const target = match.kickoff.toDate().getTime()
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) {
        setRemaining('עומד להתחיל…')
        return
      }
      const totalSec = Math.floor(diff / 1000)
      const d = Math.floor(totalSec / 86400)
      const h = Math.floor((totalSec % 86400) / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      if (d > 0) {
        setRemaining(`${d} ימים · ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
      } else {
        setRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [match])

  if (!match) return null

  return (
    <div
      className="animate-in"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 18%, var(--color-bg-elevated)) 0%, var(--color-bg-elevated) 100%)',
        border: '1px solid var(--color-border-strong)',
        boxShadow: 'var(--shadow-md)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-primary) 35%, transparent) 0%, transparent 40%)',
          pointerEvents: 'none'
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: 0.5, fontWeight: 700 }}>
            המשחק הבא · {stageLabel(match.stage, match.group)}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              letterSpacing: 1.5,
              color: 'var(--color-primary)'
            }}
          >
            {remaining}
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}
        >
          <TeamCol team={match.homeTeam} />
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 700 }}>נגד</div>
          <TeamCol team={match.awayTeam} />
        </div>
      </div>
    </div>
  )
}

function TeamCol({ team }: { team: { name: string; code: string; flag: string } }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <FlagIcon flag={team.flag} code={team.code} size={44} />
      <div style={{ fontWeight: 700, fontSize: 15 }}>{team.name}</div>
    </div>
  )
}
