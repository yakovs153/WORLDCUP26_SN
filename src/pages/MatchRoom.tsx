import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { watchRoom, sendRoomMessage, type RoomMsg } from '../lib/matchRoom'
import FlagIcon from '../components/FlagIcon'
import LiveBadge from '../components/LiveBadge'
import { formatTimeHe, stageLabel } from '../lib/format'

const REACTIONS = ['🔥', '⚽', '😱', '🎉', '👏', '😂', '💪', '😭']

export default function MatchRoom() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { matches } = useMatches()
  const { byMatchId } = usePredictions(user?.uid ?? null)
  const match = useMemo(() => matches.find((m) => m.id === id), [matches, id])
  const [msgs, setMsgs] = useState<RoomMsg[]>([])
  const [text, setText] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => watchRoom(id, setMsgs), [id])
  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }) }, [msgs])

  const send = (payload: { text?: string; emoji?: string }) => {
    if (!user) return
    sendRoomMessage(id, user.uid, user.displayName || 'אנונימי', payload)
  }

  const myPred = byMatchId[id]
  const revealed = match && match.status !== 'SCHEDULED'

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: 'calc(100vh - var(--header-height) - var(--bottom-nav-height) - 8px)' }}>
      <Link to="/" className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '6px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>← חזרה</Link>

      {match && (
        <div className="glass" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 8 }}>
            <span>{stageLabel(match.stage, match.group)}</span>
            {match.status === 'SCHEDULED' ? <span>{formatTimeHe(match.kickoff.toDate())}</span> : <LiveBadge status={match.status} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
            <Side name={match.homeTeam.name} code={match.homeTeam.code} flag={match.homeTeam.flag} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: match.status === 'LIVE' ? 'var(--color-primary)' : 'var(--color-text)' }}>
              {revealed ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}` : 'VS'}
            </div>
            <Side name={match.awayTeam.name} code={match.awayTeam.code} flag={match.awayTeam.flag} />
          </div>
          {revealed && myPred && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
              הניחוש שלך: <b style={{ color: 'var(--color-text)' }}>{myPred.homeScore}–{myPred.awayScore}</b>
            </div>
          )}
        </div>
      )}

      {/* Reactions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {REACTIONS.map((e) => (
          <button key={e} onClick={() => send({ emoji: e })} className="glass" style={{ fontSize: 22, padding: '6px 12px', cursor: 'pointer' }}>{e}</button>
        ))}
      </div>

      {/* Feed */}
      <div ref={feedRef} className="glass" style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.length === 0 && <div className="text-muted" style={{ textAlign: 'center', margin: 'auto', fontSize: 13 }}>היו הראשונים להגיב! 🎙️</div>}
        {msgs.map((m) => {
          const me = m.uid === user?.uid
          if (m.emoji && !m.text) {
            return <div key={m.id} style={{ alignSelf: me ? 'flex-start' : 'flex-end', fontSize: 28 }} title={m.name}>{m.emoji}</div>
          }
          return (
            <div key={m.id} style={{ alignSelf: me ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2, textAlign: me ? 'left' : 'right' }}>{m.name}</div>
              <div style={{ background: me ? 'var(--color-primary)' : 'var(--glass-bg-hi)', color: me ? 'var(--color-on-primary)' : 'var(--color-text)', padding: '7px 12px', borderRadius: 'var(--radius-md)', fontSize: 14 }}>
                {m.emoji ? `${m.emoji} ` : ''}{m.text}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { send({ text: text.trim() }); setText('') } }} style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="כתוב הודעה…" style={{ flex: 1, padding: '12px 14px', background: 'var(--glass-bg-hi)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', outline: 'none' }} />
        <button type="submit" className="btn" disabled={!text.trim()} style={{ padding: '0 18px' }}>שלח</button>
      </form>
    </div>
  )
}

function Side({ name, code, flag }: { name: string; code: string; flag: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <FlagIcon flag={flag} code={code} size={40} />
      <span style={{ fontSize: 13, fontWeight: 700 }}>{name || 'להיקבע'}</span>
    </div>
  )
}
