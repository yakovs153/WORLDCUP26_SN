import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { setDemoPrediction } from './demoData'

export async function savePrediction(
  uid: string,
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const h = Math.max(0, Math.min(30, Math.floor(homeScore)))
  const a = Math.max(0, Math.min(30, Math.floor(awayScore)))

  if (DEMO_MODE) {
    setDemoPrediction(matchId, h, a)
    return
  }

  const id = `${uid}_${matchId}`
  const ref = doc(db, 'predictions', id)
  const existing = await getDoc(ref)
  const base = {
    uid,
    matchId,
    homeScore: Math.max(0, Math.min(30, Math.floor(homeScore))),
    awayScore: Math.max(0, Math.min(30, Math.floor(awayScore))),
    submittedAt: serverTimestamp()
  }
  if (existing.exists()) {
    await setDoc(ref, { ...base, points: existing.data().points ?? null }, { merge: true })
  } else {
    await setDoc(ref, { ...base, points: null })
  }
}
