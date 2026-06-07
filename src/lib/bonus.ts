import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { setDemoBonus } from './demoData'
import { logActivity } from './activity'

export async function saveBonus(
  uid: string,
  championTeamCode: string | null,
  topScorer: string | null,
  runnerUpCode: string | null = null,
  surpriseTeamCode: string | null = null,
  flopTeamCode: string | null = null
): Promise<void> {
  if (DEMO_MODE) {
    setDemoBonus(championTeamCode, topScorer, runnerUpCode, surpriseTeamCode, flopTeamCode)
    return
  }
  const ref = doc(db, 'bonusPredictions', uid)
  await setDoc(
    ref,
    {
      uid,
      championTeamCode,
      topScorer,
      runnerUpCode,
      surpriseTeamCode,
      flopTeamCode,
      championPoints: null,
      topScorerPoints: null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  )
  logActivity('bonus_save', { champion: championTeamCode || '', runnerUp: runnerUpCode || '', surprise: surpriseTeamCode || '', flop: flopTeamCode || '', topScorer: topScorer || '' })
}
