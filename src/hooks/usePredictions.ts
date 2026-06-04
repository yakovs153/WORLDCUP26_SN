import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { getDemoPredictions } from '../lib/demoData'
import type { Prediction } from '../types'

export function usePredictions(uid: string | null) {
  const [byMatchId, setByMatchId] = useState<Record<string, Prediction>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setByMatchId({})
      setLoading(false)
      return
    }
    if (DEMO_MODE) {
      const refresh = () => setByMatchId(getDemoPredictions(uid))
      refresh()
      setLoading(false)
      window.addEventListener('demo-predictions-changed', refresh)
      return () => window.removeEventListener('demo-predictions-changed', refresh)
    }
    const q = query(collection(db, 'predictions'), where('uid', '==', uid))
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, Prediction> = {}
      snap.forEach((d) => {
        const data = d.data() as Omit<Prediction, 'id'>
        map[data.matchId] = { id: d.id, ...data }
      })
      setByMatchId(map)
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { byMatchId, loading }
}
