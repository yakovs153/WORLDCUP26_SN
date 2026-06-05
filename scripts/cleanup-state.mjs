/**
 * Cleanup leftover TEST STATE (non-destructive: updates only, no doc deletes).
 * Zeroes user points, resets every match to SCHEDULED with no score/clock, and
 * clears Hall of Fame + king. Predictions are assumed already empty.
 * Run after testing so production looks pristine before kickoff.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

const users = await db.collection('users').get()
const ub = db.batch()
users.docs.forEach((d) => ub.set(d.ref, { totalPoints: 0, predictionsCount: 0 }, { merge: true }))
await ub.commit()

const matches = await db.collection('matches').get()
let mb = db.batch(), n = 0
for (const d of matches.docs) {
  mb.set(d.ref, { status: 'SCHEDULED', homeScore: null, awayScore: null, minute: null, scorers: [], scored: false, autofilled: false, manualLock: false }, { merge: true })
  if (++n % 400 === 0) { await mb.commit(); mb = db.batch() }
}
await mb.commit()

await db.collection('stats').doc('hallOfFame').set({})
await db.collection('appState').doc('king').set({ uid: '', name: '', totalPoints: 0, updatedAt: Timestamp.now() })
await db.collection('appState').doc('kingMessage').set({ message: '', byUid: '' })

console.log(`cleanup done — users zeroed:${users.size} matches reset:${matches.size}`)
