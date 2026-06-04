import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { setDemoBonus } from './demoData'

export async function saveBonus(
  uid: string,
  championTeamCode: string | null,
  topScorer: string | null
): Promise<void> {
  if (DEMO_MODE) {
    setDemoBonus(championTeamCode, topScorer)
    return
  }
  const ref = doc(db, 'bonusPredictions', uid)
  await setDoc(
    ref,
    {
      uid,
      championTeamCode,
      topScorer,
      championPoints: null,
      topScorerPoints: null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  )
}
