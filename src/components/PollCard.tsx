import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { castVote, getMyVoteAsync, getTally, type PollTally } from '../lib/polls'
import type { Poll } from '../types'

interface Props {
  poll: Poll
}

export default function PollCard({ poll }: Props) {
  const { user } = useAuth()
  const [vote, setVote] = useState<string | null>(null)
  const [tally, setTally] = useState<PollTally>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancel = false
    const refresh = async () => {
      const [v, t] = await Promise.all([getMyVoteAsync(poll.id, user.uid), getTally(poll.id)])
      if (!cancel) {
        setVote(v)
        setTally(t)
      }
    }
    refresh()
    const handler = () => refresh()
    window.addEventListener('demo-poll-changed', handler)
    return () => {
      cancel = true
      window.removeEventListener('demo-poll-changed', handler)
    }
  }, [poll.id, user])

  const total = Object.values(tally).reduce((a, b) => a + b, 0)

  const handleVote = async (optionId: string) => {
    if (!user || vote || busy) return
    setBusy(true)
    try {
      await castVote(poll.id, user.uid, optionId)
      setVote(optionId)
      const t = await getTally(poll.id)
      setTally(t)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card animate-in" style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>📊</span>
        <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 0.5, fontSize: 17 }}>{poll.question}</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {poll.options.map((o) => {
          const count = tally[o.id] || 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const selected = vote === o.id
          const showResults = vote !== null

          return (
            <button
              key={o.id}
              disabled={!!vote || busy}
              onClick={() => handleVote(o.id)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '12px 14px',
                background: 'var(--color-bg-elevated)',
                border: selected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'right',
                cursor: vote ? 'default' : 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              {/* result bar (only after voting) */}
              {showResults && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0,
                    insetInlineStart: 0,
                    height: '100%',
                    width: `${pct}%`,
                    background: selected
                      ? 'color-mix(in srgb, var(--color-primary) 25%, transparent)'
                      : 'color-mix(in srgb, var(--color-border-strong) 35%, transparent)',
                    transition: 'width 0.4s ease'
                  }}
                />
              )}
              <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {o.label}
                  {selected && <span style={{ marginInlineStart: 6, color: 'var(--color-primary)' }}>✓</span>}
                </span>
                {showResults && <span style={{ fontWeight: 800, fontSize: 13 }}>{pct}%</span>}
              </span>
            </button>
          )
        })}
      </div>

      {vote && (
        <p className="text-muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 8 }}>
          הצבעת. סה״כ {total} מצביעים.
        </p>
      )}
    </div>
  )
}
