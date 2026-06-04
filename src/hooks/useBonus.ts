import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { getDemoBonus } from '../lib/demoData'
import type { BonusPrediction } from '../types'

export function useBonus(uid: string | null) {
  const [data, setData] = useState<BonusPrediction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setData(null)
      setLoading(false)
      return
    }
    if (DEMO_MODE) {
      const refresh = () => setData(getDemoBonus(uid))
      refresh()
      setLoading(false)
      window.addEventListener('demo-bonus-changed', refresh)
      return () => window.removeEventListener('demo-bonus-changed', refresh)
    }
    const unsub = onSnapshot(doc(db, 'bonusPredictions', uid), (snap) => {
      if (!snap.exists()) {
        setData({
          uid,
          championTeamCode: null,
          topScorer: null,
          championPoints: null,
          topScorerPoints: null,
          updatedAt: { toDate: () => new Date() } as never
        })
      } else {
        setData(snap.data() as BonusPrediction)
      }
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { data, loading }
}
