/**
 * Daily stats — recomputes predictionsCount per user + the Hall of Fame.
 * These read EVERY prediction, so they run once a day (not in the 5-min sync)
 * to stay well within the Firestore free read quota. Same keyless auth.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

const allPreds = await db.collection('predictions').get()

// predictionsCount per user
const counts = new Map()
for (const d of allPreds.docs) { const uid = d.data().uid; counts.set(uid, (counts.get(uid) || 0) + 1) }
const cBatch = db.batch()
for (const [uid, n] of counts) cBatch.set(db.collection('users').doc(uid), { predictionsCount: n }, { merge: true })
await cBatch.commit()

// Hall of Fame & Shame
const results = new Map()
;(await db.collection('matches').where('status', '==', 'FINISHED').get()).forEach((d) => {
  const m = d.data()
  if (typeof m.homeScore === 'number' && typeof m.awayScore === 'number') results.set(d.id, { h: m.homeScore, a: m.awayScore })
})
const agg = new Map()
for (const d of allPreds.docs) {
  const p = d.data()
  const a = agg.get(p.uid) || { exact: 0, predGoals: 0, predCount: 0, draws: 0, points: 0 }
  if (p.homeScore === p.awayScore) a.draws++
  const res = results.get(p.matchId)
  if (res) {
    a.predCount++
    a.predGoals += p.homeScore + p.awayScore
    a.points += p.points || 0
    if (p.homeScore === res.h && p.awayScore === res.a) a.exact++
  }
  agg.set(p.uid, a)
}
const names = new Map()
;(await db.collection('users').get()).forEach((d) => names.set(d.id, d.data().displayName || 'משתמש'))
const nm = (uid) => names.get(uid) || 'משתמש'
const arr = [...agg.entries()]
const hof = {}
const prophet = arr.filter(([, a]) => a.exact > 0).sort((x, y) => y[1].exact - x[1].exact)[0]
if (prophet) hof.prophet = { name: nm(prophet[0]), detail: `${prophet[1].exact} תוצאות בול` }
const opt = arr.filter(([, a]) => a.predCount >= 3).sort((x, y) => y[1].predGoals / y[1].predCount - x[1].predGoals / x[1].predCount)[0]
if (opt) hof.optimist = { name: nm(opt[0]), detail: `ממוצע ${(opt[1].predGoals / opt[1].predCount).toFixed(1)} שערים למשחק` }
const drw = arr.filter(([, a]) => a.draws >= 2).sort((x, y) => y[1].draws - x[1].draws)[0]
if (drw) hof.draw = { name: nm(drw[0]), detail: `${drw[1].draws} ניחושי תיקו` }
const dis = arr.filter(([, a]) => a.predCount >= 3).sort((x, y) => x[1].points - y[1].points)[0]
if (dis) hof.disaster = { name: nm(dis[0]), detail: `${dis[1].points} נק׳ מ-${dis[1].predCount} משחקים` }
await db.collection('stats').doc('hallOfFame').set(hof, { merge: true })

console.log(`daily-stats done — users:${counts.size} predictions:${allPreds.size} awards:${Object.keys(hof).length}`)
