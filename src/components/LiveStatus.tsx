import { useEffect, useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import { DEMO_MODE } from '../firebase'
import { getScheduleFetchedAt } from '../lib/demoData'

/**
 * Live-connection status pill. Reflects the real state of the data feed:
 *  - any match in play  → "🔴 משדר חי"
 *  - production, online  → "מחובר · עודכן …"  (green)
 *  - production, offline → "אין חיבור"          (grey)
 *  - demo                → "לוח רשמי · מצב הדגמה" (snapshot, no live feed)
 */
export default function LiveStatus() {
  const { matches } = useMatches()
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [, force] = useState(0)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const t = setInterval(() => force((n) => n + 1), 30000) // refresh "x ago"
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(t) }
  }, [])

  const liveCount = matches.filter((m) => m.status === 'LIVE').length

  // Most recent server sync (prod), else the snapshot fetch time (demo).
  let lastMs = 0
  for (const m of matches) {
    const lu = m.lastUpdated?.toMillis?.()
    if (lu && lu > lastMs) lastMs = lu
  }
  if (!lastMs && DEMO_MODE) {
    const f = getScheduleFetchedAt()
    if (f) lastMs = new Date(f).getTime()
  }

  let dot = 'var(--color-text-muted)'
  let label: string
  let live = false
  if (liveCount > 0) {
    dot = 'var(--color-primary)'; live = true
    label = `משדר חי · ${liveCount} משחקים`
  } else if (DEMO_MODE) {
    dot = 'var(--color-accent)'
    label = 'לוח רשמי · מצב הדגמה'
  } else if (!online) {
    label = 'אין חיבור'
  } else {
    dot = 'var(--color-success)'
    label = lastMs ? `מחובר · עודכן ${relativeHe(lastMs)}` : 'מחובר'
  }

  return (
    <div
      className="glass"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', borderRadius: 'var(--radius-full)',
        fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)',
        alignSelf: 'flex-start'
      }}
    >
      <span
        className={live ? 'live-dot' : ''}
        style={{ width: 9, height: 9, borderRadius: '50%', background: dot, display: 'inline-block', marginInlineStart: 0 }}
      />
      <span style={{ color: 'var(--color-text)' }}>{label}</span>
    </div>
  )
}

function relativeHe(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 0) return 'עכשיו'
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'הרגע'
  if (min < 60) return `לפני ${min} דק׳`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `לפני ${hr} שע׳`
  return `לפני ${Math.floor(hr / 24)} ימים`
}
