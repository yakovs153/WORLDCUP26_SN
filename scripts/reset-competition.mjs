/**
 * RESET the competition to an empty production state. DESTRUCTIVE.
 *
 * Deletes all predictions + bonus predictions, zeroes every user's points and
 * counts, clears Hall of Fame and the king, and clears per-match scoring/lock
 * flags so the live feed drives everything fresh. Does NOT touch user accounts,
 * the schedule (matches), appConfig, surveys, or the playground.
 *
 * Run once before launch / after testing. Same keyless auth as the sync.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Safety gate: must pass CONFIRM equal to the shared RESET_PHRASE secret.
const PHRASE = process.env.RESET_PHRASE || ''
if (!PHRASE || process.env.CONFIRM !== PHRASE) {
  console.error('Refusing to reset: CONFIRM must equal the RESET_PHRASE secret. Aborting.')
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

async function deleteAll(coll) {
  let total = 0
  for (;;) {
    const docs = (await db.collection(coll).limit(400).get()).docs
    if (docs.length === 0) break
    const b = db.batch()
    docs.forEach((d) => b.delete(d.ref))
    await b.commit()
    total += docs.length
  }
  return total
}

const preds = await deleteAll('predictions')
const bonus = await deleteAll('bonusPredictions')

const users = await db.collection('users').get()
const ub = db.batch()
users.docs.forEach((d) => ub.set(d.ref, { totalPoints: 0, predictionsCount: 0 }, { merge: true }))
await ub.commit()

await db.collection('stats').doc('hallOfFame').set({})
await db.collection('appState').doc('king').delete().catch(() => {})
await db.collection('appState').doc('kingMessage').delete().catch(() => {})

const matches = await db.collection('matches').get()
const mb = db.batch()
matches.docs.forEach((d) => mb.set(d.ref, { scored: false, autofilled: false, manualLock: false, scorers: [] }, { merge: true }))
await mb.commit()

console.log(`reset done — predictions:${preds} bonus:${bonus} users zeroed:${users.size} matches reset:${matches.size}`)
