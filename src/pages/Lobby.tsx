import { useEffect, useMemo, useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useGoldenBoot } from '../hooks/useGoldenBoot'
import { useAppConfig } from '../hooks/useAppConfig'
import FlagIcon from '../components/FlagIcon'
import CubeMark from '../components/CubeMark'
import Wc2026Mark from '../components/Wc2026Mark'
import { TOP_SCORER_CANDIDATES } from '../lib/players'
import { formatTimeHe, formatDateHe } from '../lib/format'

/**
 * Public, read-only, full-screen view for an office TV / lobby screen.
 * Auto-rotates between panels. Route: /tv (no login).
 */
const PANEL_MS = 9000

export default function Lobby() {
  const { matches } = useMatches()
  const { entries } = useLeaderboard(100)
  const goals = useGoldenBoot()
  const cfg = useAppConfig()

  const live = useMemo(() => matches.filter((m) => m.status === 'LIVE'), [matches])
  const next = useMemo(() => {
    const now = Date.now()
    return matches.filter((m) => m.status === 'SCHEDULED' && m.kickoff.toMillis() > now)
      .sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())[0] || null
  }, [matches])

  const deptRows = useMemo(() => {
    const map = new Map<string, { total: number; members: number }>()
    for (const e of entries) {
      const d = e.department || 'ללא מחלקה'
      const c = map.get(d) || { total: 0, members: 0 }
      c.total += e.totalPoints; c.members++; map.set(d, c)
    }
    return [...map.entries()].map(([department, v]) => ({ department, ...v })).sort((a, b) => b.total - a.total)
  }, [entries])

  const topScorers = useMemo(() =>
    TOP_SCORER_CANDIDATES.map((p) => ({ p, g: goals[p.name] ?? 0 })).sort((a, b) => b.g - a.g).slice(0, 6)
  , [goals])

  // Build the rotation (skip empty panels).
  const panels = useMemo(() => {
    const list: string[] = ['matches']
    if (deptRows.length) list.push('departments')
    if (entries.length) list.push('players')
    if (topScorers.some((s) => s.g > 0)) list.push('scorers')
    return list
  }, [deptRows.length, entries.length, topScorers])

  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % Math.max(1, panels.length)), PANEL_MS)
    return () => clearInterval(t)
  }, [panels.length])
  const panel = panels[i % panels.length] || 'matches'

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: 'clamp(16px, 3vw, 40px)', direction: 'rtl' }}>
      <div className="glow-bg" aria-hidden />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'clamp(16px,2.5vw,32px)' }}>
        <CubeMark size={46} />
        <span style={{ fontFamily: 'var(--font-display)', letterSpacing: 3, fontSize: 'clamp(26px,4vw,52px)' }}>
          STORE<span style={{ color: 'var(--color-primary)' }}>NEXT</span> · {cfg.content.tournamentName}
        </span>
        <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {live.length > 0 && (
            <span className="points-flight" style={{ fontSize: 'clamp(14px,1.6vw,22px)' }}>🔴 LIVE</span>
          )}
          <Wc2026Mark height={40} />
        </span>
      </div>

      {panel === 'matches' && <MatchesPanel live={live} next={next} />}
      {panel === 'departments' && <ListPanel title="🏢 מירוץ המחלקות" rows={deptRows.slice(0, 6).map((d, n) => ({ rank: n + 1, name: d.department, sub: `${d.members} משתתפים`, value: d.total }))} />}
      {panel === 'players' && <ListPanel title="🏆 טבלת הדירוג" rows={entries.slice(0, 6).map((e) => ({ rank: e.rank, name: e.displayName, sub: e.department || '', value: e.totalPoints }))} />}
      {panel === 'scorers' && <ListPanel title="⚽ מירוץ נעל הזהב" rows={topScorers.map((s, n) => ({ rank: n + 1, name: s.p.name, sub: s.p.display.split('·')[1]?.trim() || '', value: s.g, code: s.p.countryCode }))} />}

      {/* dots */}
      <div style={{ position: 'absolute', bottom: 18, insetInlineStart: 0, right: 0, display: 'flex', gap: 8, justifyContent: 'center' }}>
        {panels.map((_, n) => (
          <span key={n} style={{ width: 10, height: 10, borderRadius: '50%', background: n === i % panels.length ? 'var(--color-primary)' : 'var(--glass-border)' }} />
        ))}
      </div>
    </div>
  )
}

function MatchesPanel({ live, next }: { live: import('../types').Match[]; next: import('../types').Match | null }) {
  if (live.length > 0) {
    return (
      <div style={{ display: 'grid', gap: 'clamp(12px,2vw,24px)' }}>
        {live.slice(0, 3).map((m) => (
          <div key={m.id} className="glass" style={{ padding: 'clamp(16px,3vw,36px)', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
            <Team flag={m.homeTeam.flag} code={m.homeTeam.code} name={m.homeTeam.name} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(50px,9vw,120px)', color: 'var(--color-primary)', lineHeight: 1, textShadow: '0 0 30px rgba(225,29,72,.5)' }}>
                {m.homeScore ?? 0}<span style={{ opacity: 0.4 }}> : </span>{m.awayScore ?? 0}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'clamp(13px,1.5vw,20px)', marginTop: 6 }}>🔴 חי</div>
            </div>
            <Team flag={m.awayTeam.flag} code={m.awayTeam.code} name={m.awayTeam.name} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="glass" style={{ padding: 'clamp(24px,5vw,60px)', textAlign: 'center' }}>
      <div style={{ color: 'var(--color-text-muted)', fontSize: 'clamp(14px,1.6vw,22px)', marginBottom: 16 }}>המשחק הבא</div>
      {next ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(20px,5vw,80px)' }}>
            <Team flag={next.homeTeam.flag} code={next.homeTeam.code} name={next.homeTeam.name} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,52px)', color: 'var(--color-text-muted)' }}>VS</span>
            <Team flag={next.awayTeam.flag} code={next.awayTeam.code} name={next.awayTeam.name} />
          </div>
          <div style={{ marginTop: 20, fontSize: 'clamp(16px,2vw,28px)', color: 'var(--color-accent)' }}>
            {formatDateHe(next.kickoff.toDate())} · {formatTimeHe(next.kickoff.toDate())}
          </div>
        </>
      ) : <div style={{ fontSize: 'clamp(18px,2.5vw,32px)' }}>אין משחקים מתוכננים</div>}
    </div>
  )
}

function Team({ flag, code, name }: { flag: string; code: string; name: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'clamp(36px,6vw,84px)', lineHeight: 1 }}><FlagIcon flag={flag} code={code} size={64} /></div>
      <div style={{ fontWeight: 800, fontSize: 'clamp(16px,2vw,30px)', marginTop: 8 }}>{name || 'להיקבע'}</div>
    </div>
  )
}

function ListPanel({ title, rows }: { title: string; rows: { rank: number; name: string; sub?: string; value: number; code?: string }[] }) {
  const medal = (r: number) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r)
  return (
    <div className="glass" style={{ padding: 'clamp(16px,3vw,36px)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: 2, fontSize: 'clamp(24px,3.5vw,44px)', marginBottom: 'clamp(10px,1.5vw,20px)' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px,1vw,12px)' }}>
        {rows.map((r) => (
          <div key={r.name + r.rank} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', alignItems: 'center', gap: 16, padding: 'clamp(8px,1.2vw,16px) clamp(8px,1.5vw,20px)', background: 'var(--glass-bg-hi)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3vw,40px)', color: r.rank <= 3 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{medal(r.rank)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, fontSize: 'clamp(16px,2vw,30px)' }}>
              {r.code ? <FlagIcon flag="" code={r.code} size={28} /> : null}
              {r.name}{r.sub ? <span style={{ fontSize: 'clamp(11px,1.2vw,16px)', color: 'var(--color-text-muted)', fontWeight: 500 }}>· {r.sub}</span> : null}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,3.2vw,44px)', color: 'var(--color-primary)' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
