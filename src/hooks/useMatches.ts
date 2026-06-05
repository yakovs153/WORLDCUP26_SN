import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { getDemoMatches } from '../lib/demoData'
import { localizeTeam } from '../lib/teamNames'
import type { Match } from '../types'

interface SnapItem { id: string; homeTeam: Match['homeTeam']; awayTeam: Match['awayTeam']; kickoffMs: number; stage: Match['stage']; group: string | null; status: Match['status']; homeScore: number | null; awayScore: number | null; minute?: number | null; scorers?: Match['scorers'] }
function fromSnap(it: SnapItem): Match {
  return {
    id: it.id, homeTeam: localizeTeam(it.homeTeam), awayTeam: localizeTeam(it.awayTeam),
    kickoff: Timestamp.fromMillis(it.kickoffMs), stage: it.stage, group: it.group,
    status: it.status, homeScore: it.homeScore, awayScore: it.awayScore, minute: it.minute ?? null, scorers: it.scorers ?? []
  }
}

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (DEMO_MODE) {
      const refresh = () => setMatches(getDemoMatches())
      refresh()
      setLoading(false)
      window.addEventListener('demo-matches-changed', refresh)
      window.addEventListener('demo-predictions-changed', refresh)
      window.addEventListener('storage', refresh)
      return () => {
        window.removeEventListener('demo-matches-changed', refresh)
        window.removeEventListener('demo-predictions-changed', refresh)
        window.removeEventListener('storage', refresh)
      }
    }
    // Read ONE snapshot doc (cheap). Fall back to the full collection only if the
    // snapshot doesn't exist yet (e.g. before the first sync run).
    let unsubCol: (() => void) | null = null
    const subscribeCollection = () => {
      if (unsubCol) return
      const q = query(collection(db, 'matches'), orderBy('kickoff', 'asc'))
      unsubCol = onSnapshot(q, (snap) => {
        setMatches(snap.docs.map((d) => {
          const m = { id: d.id, ...(d.data() as Omit<Match, 'id'>) }
          return { ...m, homeTeam: localizeTeam(m.homeTeam), awayTeam: localizeTeam(m.awayTeam) }
        }))
        setLoading(false)
      }, (err) => { setError(err); setLoading(false) })
    }
    const unsubSnap = onSnapshot(doc(db, 'snapshot', 'matches'), (s) => {
      const items = s.exists() ? (s.data().items as SnapItem[] | undefined) : undefined
      if (Array.isArray(items) && items.length) {
        if (unsubCol) { unsubCol(); unsubCol = null }
        setMatches(items.map(fromSnap))
        setLoading(false)
      } else {
        subscribeCollection()
      }
    }, () => subscribeCollection())
    return () => { unsubSnap(); if (unsubCol) unsubCol() }
  }, [])

  return { matches, loading, error }
}
