import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'

interface RecentResult { result: string; score: string; opp: string; date: string }
interface H2HResult { date: string; home: string; away: string; hs: string; as: string; comp: string }
interface NewsItem { headline: string; link: string }
interface Preview {
  homeForm?: string; awayForm?: string
  homeRecent?: RecentResult[]; awayRecent?: RecentResult[]
  h2h?: H2HResult[]; news?: NewsItem[]
}

const DEMO_PREVIEW: Preview = {
  homeForm: 'WWWDD', awayForm: 'WDLDL',
  h2h: [
    { date: '2010-06-11', home: 'דרום אפריקה', away: 'מקסיקו', hs: '1', as: '1', comp: 'מונדיאל 2010' },
    { date: '2005-06-12', home: 'מקסיקו', away: 'דרום אפריקה', hs: '2', as: '1', comp: 'גביע הקונפדרציות' }
  ],
  news: [
    { headline: 'קלינסמן מהמר על ברזיל לזכות במונדיאל', link: '#' },
    { headline: 'הרכב מקסיקו: שתי הפתעות בקו ההתקפה', link: '#' }
  ]
}

/** "לקראת המשחק" — free, no-key context from ESPN (form, head-to-head, news),
 *  refreshed periodically by the matchPreview Cloud Function. Shows nothing
 *  until there's data, so it never leaves an empty shell. */
export default function MatchPreview({ matchId, homeName, awayName }: { matchId: string; homeName: string; awayName: string }) {
  const [p, setP] = useState<Preview | null>(DEMO_MODE ? DEMO_PREVIEW : null)

  useEffect(() => {
    if (DEMO_MODE) return
    return onSnapshot(doc(db, 'matchPreviews', matchId), (s) => setP(s.exists() ? (s.data() as Preview) : null))
  }, [matchId])

  if (!p) return null
  const hasForm = !!(p.homeForm || p.awayForm)
  if (!hasForm) return null

  return (
    <div className="glass" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 800, letterSpacing: 0.5 }}>📋 כושר אחרון</div>

      {/* Recent form — colored W/D/L pills per team */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <FormRow name={homeName} form={p.homeForm} />
        <FormRow name={awayName} form={p.awayForm} />
      </div>

      <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'left', opacity: 0.7 }}>נתונים: ESPN</div>
    </div>
  )
}

function FormRow({ name, form }: { name: string; form?: string }) {
  if (!form) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {form.split('').slice(0, 6).map((r, i) => (
          <span key={i} style={{
            width: 18, height: 18, borderRadius: 4, fontSize: 10, fontWeight: 800,
            display: 'grid', placeItems: 'center', color: '#fff',
            background: r === 'W' ? 'var(--color-primary)' : r === 'D' ? 'var(--color-border-strong)' : 'var(--color-text-muted)'
          }}>{heResult(r)}</span>
        ))}
      </div>
    </div>
  )
}

const heResult = (r: string) => (r === 'W' ? 'נ' : r === 'D' ? 'ת' : r === 'L' ? 'ה' : r)
