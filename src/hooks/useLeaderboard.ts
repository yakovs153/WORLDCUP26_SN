import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, DEMO_MODE, auth } from '../firebase'
import { getDemoLeaderboard } from '../lib/demoData'
import type { LeaderboardEntry, UserDoc } from '../types'

export function useLeaderboard(top = 100) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_MODE) {
      const refresh = () => {
        const me = auth.currentUser
        const rows = getDemoLeaderboard(me?.uid || 'me', me?.displayName || me?.email?.split('@')[0] || 'אני')
        setEntries(rows.slice(0, top).map((u, i) => ({ ...u, rank: i + 1 })))
      }
      refresh()
      setLoading(false)
      window.addEventListener('demo-predictions-changed', refresh)
      return () => window.removeEventListener('demo-predictions-changed', refresh)
    }
    const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(top))
    const unsub = onSnapshot(q, (snap) => {
      const rows: LeaderboardEntry[] = []
      snap.docs.forEach((d, idx) => {
        rows.push({ ...(d.data() as UserDoc), rank: idx + 1 })
      })
      setEntries(rows)
      setLoading(false)
    })
    return unsub
  }, [top])

  return { entries, loading }
}
