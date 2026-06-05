/**
 * Playground SIMULATOR — fakes a live match into `playgroundMatches` so we can
 * verify the whole realtime pipeline (DB → onSnapshot → UI) BEFORE the World
 * Cup, when no real covered competition is playing. Watch it on /playground.
 *
 * Advances the clock and score over time within one run, then marks FINISHED.
 * Env: SIM_MINUTES (wall-clock minutes to run, default 5), STEP_SECONDS (default 8).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

const STEP = Math.max(2, parseInt(process.env.STEP_SECONDS || '8', 10))
const WALL = Math.max(1, parseInt(process.env.SIM_MINUTES || '5', 10)) * 60
const STEPS = Math.max(6, Math.floor(WALL / STEP))
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000))

const HOME = { name: 'ברזיל', code: 'BRA', flag: '' }
const AWAY = { name: 'ארגנטינה', code: 'ARG', flag: '' }
const SCORER_POOL = [
  { name: 'Vinícius Jr.', team: 'BRA' }, { name: 'Raphinha', team: 'BRA' },
  { name: 'L. Martínez', team: 'ARG' }, { name: 'J. Álvarez', team: 'ARG' }
]

let hs = 0, as = 0
const scorers = []

console.log(`sim: ${STEPS} steps × ${STEP}s (~${Math.round(STEPS * STEP / 60)} min)`)
for (let i = 0; i <= STEPS; i++) {
  const minute = Math.min(90, Math.round((i / STEPS) * 90))
  // ~20% chance of a goal each step (after minute 0)
  if (i > 0 && Math.random() < 0.2) {
    const s = SCORER_POOL[Math.floor(Math.random() * SCORER_POOL.length)]
    if (s.team === 'BRA') hs++; else as++
    scorers.push({ name: s.name, team: s.team, minute })
  }
  const finished = i === STEPS
  await db.collection('playgroundSnapshot').doc('current').set({
    items: [{
      id: 'sim-1', homeTeam: HOME, awayTeam: AWAY, kickoffMs: Date.now(),
      status: finished ? 'FINISHED' : 'LIVE', homeScore: hs, awayScore: as,
      minute: finished ? 90 : minute, scorers, competition: 'סימולציה — בדיקת חיבור'
    }],
    updatedAt: Timestamp.now()
  })
  console.log(`  ${minute}'  ${hs}-${as}${finished ? '  (FT)' : ''}`)
  if (!finished) await sleep(STEP)
}
console.log('sim done')
