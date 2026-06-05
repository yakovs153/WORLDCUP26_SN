import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { getDemoMatches } from '../lib/demoData'
import { localizeTeam } from '../lib/teamNames'
import type { Match } from '../types'

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
    const q = query(collection(db, 'matches'), orderBy('kickoff', 'asc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: Match[] = snap.docs.map((d) => {
          const m = { id: d.id, ...(d.data() as Omit<Match, 'id'>) }
          return { ...m, homeTeam: localizeTeam(m.homeTeam), awayTeam: localizeTeam(m.awayTeam) }
        })
        setMatches(out)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  return { matches, loading, error }
}
