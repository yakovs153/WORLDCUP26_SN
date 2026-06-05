import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useMatches } from '../hooks/useMatches'
import { useAppConfig } from '../hooks/useAppConfig'
import { useLivePoints } from '../hooks/useLivePoints'
import { LeaderboardRowSkeleton } from '../components/Skeleton'
import HallOfFame from '../components/HallOfFame'
import OctopusMark from '../components/OctopusMark'
import CountUp from '../components/CountUp'
import { octopusEntry, OCTOPUS_UID } from '../lib/octopus'
import type { LeaderboardEntry } from '../types'

export default function Leaderboard() {
  const { user } = useAuth()
  const { entries, loading } = useLeaderboard(200)
  const { matches } = useMatches()
  const cfg = useAppConfig()
  const [tab, setTab] = useState<'personal' | 'departments'>('personal')

  const liveUids = useMemo(() => entries.map((e) => e.uid), [entries])
  const liveDelta = useLivePoints(matches, cfg.scoring, liveUids, cfg.stageMultipliers, cfg.analystOverrides)
  const hasLive = useMemo(() => matches.some((m) => m.status === 'LIVE'), [matches])

  // Inject the Octopus + fold in provisional points from any live matches.
  const ranked = useMemo(() => {
    const octo = octopusEntry(matches, cfg.scoring, cfg.stageMultipliers, cfg.analystOverrides) // includes live, provisional
    const withLive = entries
      .filter((e) => e.uid !== OCTOPUS_UID)
      .map((e) => ({ ...e, totalPoints: e.totalPoints + (liveDelta.get(e.uid) || 0) }))
    const all = [...withLive, octo]
    all.sort((a, b) => b.totalPoints - a.totalPoints)
    return all.map((e, i) => ({ ...e, rank: i + 1 }))
  }, [entries, matches, cfg.scoring, cfg.stageMultipliers, liveDelta])

  // Departments exclude the Octopus (it isn't an employee).
  const deptRows = useMemo(() => aggregateDepartments(ranked.filter((e) => e.uid !== OCTOPUS_UID)), [ranked])

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        טבלת דירוג
        {hasLive && <span className="points-flight" style={{ fontSize: 12 }}>🔴 מתעדכן בזמן אמת</span>}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: 'var(--glass-bg-hi)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-full)' }}>
        <Toggle active={tab === 'personal'} onClick={() => setTab('personal')}>👤 אישי</Toggle>
        <Toggle active={tab === 'departments'} onClick={() => setTab('departments')}>🏢 מחלקות</Toggle>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 0 }}>{[0, 1, 2, 3, 4].map((i) => <LeaderboardRowSkeleton key={i} />)}</div>
      ) : tab === 'personal' ? (
        <Personal entries={ranked} meUid={user?.uid} />
      ) : (
        <Departments rows={deptRows} myDept={ranked.find((e) => e.uid === user?.uid)?.department ?? null} />
      )}

      <HallOfFame />
    </div>
  )
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 13,
      background: active ? 'var(--color-primary)' : 'transparent',
      color: active ? 'var(--color-on-primary)' : 'var(--color-text-muted)'
    }}>{children}</button>
  )
}

function Personal({ entries, meUid }: { entries: LeaderboardEntry[]; meUid?: string }) {
  if (entries.length === 0) return <div className="card" style={{ textAlign: 'center' }}>עוד אין משתמשים בדירוג</div>
  return (
    <div className="card stagger" style={{ padding: 0, overflow: 'hidden' }}>
      {entries.map((e) => {
        const me = meUid === e.uid
        const king = e.rank === 1 && e.totalPoints > 0
        return (
          <div key={e.uid} className="animate-in" style={{
            display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            background: king ? 'linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent)'
              : me ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: king ? 24 : 20, color: e.rank <= 3 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              {king ? '👑' : medal(e.rank) || e.rank}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {e.uid === OCTOPUS_UID ? <OctopusMark size={32} />
                : e.photoURL ? <img src={e.photoURL} alt="" width={32} height={32} style={{ borderRadius: '50%' }} />
                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--glass-bg-hi)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>{e.displayName.charAt(0).toUpperCase()}</div>}
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {e.displayName}
                  {king && <span style={{ fontSize: 10, fontWeight: 800, color: '#1a1320', background: 'var(--color-accent)', padding: '1px 8px', borderRadius: 'var(--radius-full)' }}>המלך</span>}
                  {me && <span style={{ color: 'var(--color-primary)', fontSize: 12 }}>(אתה)</span>}
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>{e.department || `${e.predictionsCount} ניחושים`}</div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-primary)' }}><CountUp value={e.totalPoints} /></div>
          </div>
        )
      })}
    </div>
  )
}

interface DeptRow { department: string; total: number; members: number; avg: number }

function aggregateDepartments(entries: LeaderboardEntry[]): DeptRow[] {
  const map = new Map<string, { total: number; members: number }>()
  for (const e of entries) {
    const d = e.department || 'ללא מחלקה'
    const cur = map.get(d) || { total: 0, members: 0 }
    cur.total += e.totalPoints; cur.members += 1
    map.set(d, cur)
  }
  return [...map.entries()]
    .map(([department, v]) => ({ department, total: v.total, members: v.members, avg: v.members ? Math.round(v.total / v.members) : 0 }))
    .sort((a, b) => b.total - a.total)
}

function Departments({ rows, myDept }: { rows: DeptRow[]; myDept: string | null }) {
  if (rows.length === 0) return <div className="card" style={{ textAlign: 'center' }}>עוד אין נתוני מחלקות</div>
  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {rows.map((r, i) => {
        const mine = r.department === myDept
        return (
          <div key={r.department} className="card animate-in" style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: 'var(--space-4)',
            border: mine ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)'
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, width: 40, textAlign: 'center', color: i < 3 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              {medal(i + 1) || i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{r.department}{mine && <span style={{ color: 'var(--color-primary)', fontSize: 12, marginRight: 6 }}>(שלך)</span>}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{r.members} משתתפים · ממוצע {r.avg}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--color-primary)' }}>{r.total}</div>
              <div className="text-muted" style={{ fontSize: 10 }}>נקודות</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function medal(rank: number): string | null {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}
