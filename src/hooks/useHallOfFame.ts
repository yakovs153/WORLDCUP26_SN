import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'

export interface Award { name: string; detail: string }
export interface HallOfFame {
  prophet?: Award    // most accurate
  optimist?: Award   // predicted the most goals
  draw?: Award       // predicted the most draws
  disaster?: Award   // most predictions, fewest points
}

const DEMO_HOF: HallOfFame = {
  prophet: { name: 'עידן', detail: '3 תוצאות בול' },
  optimist: { name: 'טל', detail: 'ניחש בממוצע 4.2 שערים למשחק' },
  draw: { name: 'שרון', detail: '5 ניחושי תיקו' },
  disaster: { name: 'יעל', detail: '0 נק׳ מ-4 משחקים' }
}

export function useHallOfFame(): HallOfFame {
  const [hof, setHof] = useState<HallOfFame>(DEMO_MODE ? DEMO_HOF : {})
  useEffect(() => {
    if (DEMO_MODE) return
    return onSnapshot(doc(db, 'stats', 'hallOfFame'), (snap) => {
      setHof((snap.data() as HallOfFame) || {})
    })
  }, [])
  return hof
}
