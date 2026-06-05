/**
 * Daily stats — recomputes predictionsCount per user + the Hall of Fame.
 * These read EVERY prediction, so they run once a day (not in the 5-min sync)
 * to stay well within the Firestore free read quota. Same keyless auth.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

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

// ===== Bonus awarding — champion / runner-up / surprise / flop / top scorer =====
// Idempotent: recomputes each user's earned bonus and applies only the delta vs
// what was already awarded. Components activate as the data becomes available
// (e.g. champion only after the final). Top scorer is admin-set (name matching
// from the live feed is unreliable) via appConfig.bonusResults.topScorer.
const cfg = (await db.collection('appConfig').doc('main').get()).data() || {}
const bonusPts = cfg.bonus || { champion: 20, topScorer: 15, runnerUp: 10, surprise: 10, flop: 10 }
const adminTopScorer = cfg.bonusResults?.topScorer || null
const up = (s) => String(s || '').toUpperCase()
const codeOf = (t) => up(t?.code)

const allMatches = (await db.collection('matches').get()).docs.map((d) => d.data())
const final = allMatches.find((m) => m.stage === 'F' && m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null)
let champion = null, runnerUp = null
if (final && final.homeScore !== final.awayScore) {
  const h = codeOf(final.homeTeam), a = codeOf(final.awayTeam)
  champion = final.homeScore > final.awayScore ? h : a
  runnerUp = final.homeScore > final.awayScore ? a : h
}
const reachedIn = (stages) => {
  const s = new Set()
  for (const m of allMatches) if (stages.includes(m.stage)) { const h = codeOf(m.homeTeam), a = codeOf(m.awayTeam); if (h) s.add(h); if (a) s.add(a) }
  return s
}
const qfReachers = reachedIn(['QF', 'SF', 'TP', 'F'])
const r16Reachers = reachedIn(['R16', 'QF', 'SF', 'TP', 'F'])
const knockoutsStarted = r16Reachers.size > 0

const bps = await db.collection('bonusPredictions').get()
const bonusDelta = new Map()
for (const d of bps.docs) {
  const b = d.data()
  let pts = 0
  if (champion && up(b.championTeamCode) === champion) pts += bonusPts.champion || 0
  if (runnerUp && up(b.runnerUpCode) === runnerUp) pts += bonusPts.runnerUp || 0
  if (adminTopScorer && b.topScorer === adminTopScorer) pts += bonusPts.topScorer || 0
  if (b.surpriseTeamCode && qfReachers.has(up(b.surpriseTeamCode))) pts += bonusPts.surprise || 0
  if (knockoutsStarted && b.flopTeamCode && !r16Reachers.has(up(b.flopTeamCode))) pts += bonusPts.flop || 0
  const prev = b.awardedPoints || 0
  if (pts !== prev) {
    bonusDelta.set(b.uid, (bonusDelta.get(b.uid) || 0) + (pts - prev))
    await d.ref.set({ awardedPoints: pts }, { merge: true })
  }
}
for (const [uid, delta] of bonusDelta) if (delta) await db.collection('users').doc(uid).set({ totalPoints: FieldValue.increment(delta) }, { merge: true })

console.log(`daily-stats done — users:${counts.size} predictions:${allPreds.size} HoF:${Object.keys(hof).length} bonusAdjusted:${bonusDelta.size} champion:${champion || '-'}`)
