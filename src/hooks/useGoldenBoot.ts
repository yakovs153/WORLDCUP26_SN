import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { getDemoGoldenBoot } from '../lib/demoData'

/**
 * Goal tallies for the Golden Boot race, keyed by player name.
 * Demo: localStorage (seeded by ?sim). Production: stats/goldenBoot doc
 * (populated by an admin or the live-sync worker).
 */
export function useGoldenBoot(): Record<string, number> {
  const [goals, setGoals] = useState<Record<string, number>>({})

  useEffect(() => {
    if (DEMO_MODE) {
      const refresh = () => setGoals(getDemoGoldenBoot())
      refresh()
      window.addEventListener('demo-golden-boot-changed', refresh)
      window.addEventListener('storage', refresh)
      return () => {
        window.removeEventListener('demo-golden-boot-changed', refresh)
        window.removeEventListener('storage', refresh)
      }
    }
    return onSnapshot(doc(db, 'stats', 'goldenBoot'), (snap) => {
      const data = snap.data() as { goals?: Record<string, number> } | undefined
      setGoals(data?.goals || {})
    })
  }, [])

  return goals
}
