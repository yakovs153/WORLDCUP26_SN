import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { watchRoom, sendRoomMessage, type RoomMsg } from '../lib/matchRoom'
import FlagIcon from '../components/FlagIcon'
import LiveBadge from '../components/LiveBadge'
import { formatTimeHe, stageLabel } from '../lib/format'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { useAppConfig } from '../hooks/useAppConfig'
import { tomPick } from '../lib/octopus'
import { venueFor } from '../lib/wcVenues'
import OctopusMark from '../components/OctopusMark'
import type { Prediction, UserDoc } from '../types'

interface PeerPred { name: string; home: number; away: number; auto: boolean }

const DEMO_PEERS: PeerPred[] = [
  { name: 'רונן ל.', home: 2, away: 1, auto: false },
  { name: 'שרון ק.', home: 1, away: 1, auto: false },
  { name: 'עמית ב.', home: 0, away: 2, auto: false },
  { name: 'עמוס ואביגדור', home: 2, away: 0, auto: true }
]

const REACTIONS = ['🔥', '⚽', '😱', '🎉', '👏', '😂', '💪', '😭']

export default function MatchRoom() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const cfg = useAppConfig()
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
  const revealed = !!match && match.status !== 'SCHEDULED'

  // Everyone's predictions — only revealed once the match has kicked off.
  const [peers, setPeers] = useState<PeerPred[]>([])
  useEffect(() => {
    if (!revealed) { setPeers([]); return }
    if (DEMO_MODE) { setPeers(DEMO_PEERS); return }
    let cancelled = false
    Promise.all([
      getDocs(query(collection(db, 'predictions'), where('matchId', '==', id))),
      getDocs(collection(db, 'users'))
    ]).then(([pSnap, uSnap]) => {
      const names = new Map(uSnap.docs.map((d) => [d.id, (d.data() as UserDoc).displayName || 'משתמש']))
      const rows = pSnap.docs.map((d) => {
        const p = d.data() as Prediction
        return { name: names.get(p.uid) || 'משתמש', home: p.homeScore, away: p.awayScore, auto: !!p.auto }
      }).sort((a, b) => a.name.localeCompare(b.name, 'he'))
      if (!cancelled) setPeers(rows)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [id, revealed])

  const tom = match ? tomPick(match.homeTeam.code, match.awayTeam.code, id, cfg.analystOverrides) : null
  const consensus = useMemo(() => {
    if (!peers.length) return null
    const counts = new Map<string, number>()
    for (const p of peers) { const k = `${p.home} : ${p.away}`; counts.set(k, (counts.get(k) || 0) + 1) }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] // [scoreline, count]
  }, [peers])

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: 'calc(100vh - var(--header-height) - var(--bottom-nav-height) - 8px)' }}>
      <Link to="/" className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '6px 14px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>← חזרה</Link>

      {match && (
        <div className="glass" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 8 }}>
            <span>{stageLabel(match.stage, match.group)}</span>
            {match.status === 'SCHEDULED' ? (
              <span>{formatTimeHe(match.kickoff.toDate())}</span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {match.status === 'LIVE' && match.minute != null && (
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{match.minute}'</span>
                )}
                <LiveBadge status={match.status} />
              </span>
            )}
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
          {(() => {
            // Admin-set venue wins (manualOverride). Otherwise fall back to the
            // hardcoded WC2026 schedule lookup (group-stage matches only — KO
            // bracket matches need admin to set manually until teams resolve).
            const venue = match.venue || venueFor(match.homeTeam.code, match.awayTeam.code, match.kickoff.toMillis())
            return venue ? (
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span>📍</span>
                <span>{venue}</span>
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* Match center — Tom's pick, goals, room consensus */}
      {match && (
        <div className="glass" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
            {tom && <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}><OctopusMark size={18} /> עמוס ואביגדור מנחשים: {tom[0]} : {tom[1]}</span>}
            {consensus && <span className="text-muted">· הכי נפוץ בקרב המשתתפים: {consensus[0]} ({consensus[1]})</span>}
          </div>
          {match.scorers && match.scorers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
              {[...match.scorers].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0)).map((s, i) => (
                <span key={i}>⚽ {s.minute != null ? `${s.minute}' ` : ''}{s.name}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Everyone's predictions — locked until kickoff */}
      {!revealed ? (
        <div className="glass" style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
          🔒 ניחושי המשתתפים ייחשפו עם שריקת הפתיחה
        </div>
      ) : peers.length > 0 ? (
        <details className="glass" style={{ padding: '8px 14px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>👀 ניחושי המשתתפים ({peers.length})</summary>
          <div style={{ marginTop: 8, maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {peers.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                <span>{p.auto ? '🎲 ' : ''}{p.name}</span>
                <b>{p.home}–{p.away}</b>
              </div>
            ))}
          </div>
        </details>
      ) : null}

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
