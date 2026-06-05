import { doc, updateDoc } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { setDemoJoker } from './demoData'

/** Arm/disarm the Joker (×2 points) on a prediction. One per matchday is enforced by the caller. */
export async function setJoker(uid: string, matchId: string, on: boolean): Promise<void> {
  if (DEMO_MODE) {
    setDemoJoker(matchId, on)
    return
  }
  await updateDoc(doc(db, 'predictions', `${uid}_${matchId}`), { joker: on })
}
