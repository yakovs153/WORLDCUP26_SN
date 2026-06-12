import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'

/** Win/draw/win probabilities (percent, 0..100) for one match, from the market. */
export interface MatchOdds { home: number; draw: number; away: number; source?: string }

// Mirror the server's pair key: sort the two TLAs, alias CUR -> CUW (Curaçao).
const alias = (c: string) => { const u = (c || '').toUpperCase(); return u === 'CUR' ? 'CUW' : u }
export const oddsPairKey = (a: string, b: string) => [alias(a), alias(b)].sort().join('_')

/**
 * Real bookmaker probabilities per match, written server-side to snapshot/odds
 * by liveSync (The Odds API). Returns a lookup keyed by the sorted TLA pair.
 * Empty in demo mode and whenever odds aren't available — callers fall back to
 * the model-based winProb().
 */
export function useOdds(): (homeCode: string, awayCode: string) => MatchOdds | null {
  const [items, setItems] = useState<Record<string, MatchOdds>>({})

  useEffect(() => {
    if (DEMO_MODE) return
    return onSnapshot(doc(db, 'snapshot', 'odds'), (snap) => {
      const data = snap.data() as { items?: Record<string, MatchOdds> } | undefined
      setItems(data?.items || {})
    })
  }, [])

  return useMemo(() => (homeCode: string, awayCode: string) => {
    const o = items[oddsPairKey(homeCode, awayCode)]
    return o && typeof o.home === 'number' ? o : null
  }, [items])
}
