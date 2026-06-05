import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE, auth } from '../firebase'
import { getDemoUser } from '../lib/demoData'
import type { UserDoc } from '../types'

export function useUserDoc(uid: string | null) {
  const [data, setData] = useState<UserDoc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setData(null)
      setLoading(false)
      return
    }
    if (DEMO_MODE) {
      const refresh = () => {
        const me = auth.currentUser
        setData(getDemoUser(uid, me?.displayName || me?.email?.split('@')[0] || ''))
      }
      refresh()
      setLoading(false)
      window.addEventListener('demo-predictions-changed', refresh)
      window.addEventListener('demo-department-changed', refresh)
      return () => {
        window.removeEventListener('demo-predictions-changed', refresh)
        window.removeEventListener('demo-department-changed', refresh)
      }
    }
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      setData(snap.exists() ? (snap.data() as UserDoc) : null)
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { data, loading }
}
