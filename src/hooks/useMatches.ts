import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { getDemoMatches } from '../lib/demoData'
import type { Match } from '../types'

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (DEMO_MODE) {
      setMatches(getDemoMatches())
      setLoading(false)
      return
    }
    const q = query(collection(db, 'matches'), orderBy('kickoff', 'asc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: Match[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
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
