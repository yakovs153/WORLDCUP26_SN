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
  const hasH2H = !!p.h2h?.length
  const hasNews = !!p.news?.length
  if (!hasForm && !hasH2H && !hasNews) return null

  return (
    <div className="glass" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 800, letterSpacing: 0.5 }}>📋 לקראת המשחק</div>

      {/* Recent form — colored W/D/L pills per team */}
      {hasForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FormRow name={homeName} form={p.homeForm} />
          <FormRow name={awayName} form={p.awayForm} />
        </div>
      )}

      {/* Head-to-head */}
      {hasH2H && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 4 }}>🆚 מפגשים אחרונים</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {p.h2h!.map((g, i) => (
              <div key={i} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{g.home} <b>{g.hs}–{g.as}</b> {g.away}</span>
                <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{g.comp || yr(g.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News headlines */}
      {hasNews && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: 4 }}>📰 חדשות</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {p.news!.map((n, i) => (
              n.link && n.link !== '#' ? (
                <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none' }}>
                  • {n.headline}
                </a>
              ) : (
                <span key={i} style={{ fontSize: 12 }}>• {n.headline}</span>
              )
            ))}
          </div>
        </div>
      )}

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
const yr = (d: string) => (d ? new Date(d).getFullYear().toString() : '')
