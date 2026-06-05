/**
 * Playground sync — mirrors a CURRENTLY-LIVE competition into Firestore so we
 * can watch the live pipeline work before the World Cup starts.
 *
 * Writes to a separate `playgroundMatches` collection (never touches the real
 * `matches`). The hidden /playground page renders it live.
 *
 * Env:
 *   FOOTBALL_DATA_TOKEN  — required
 *   COMP                 — optional competition code (e.g. CL, PL, BL1, PD, SA, WC).
 *                          Empty = today's matches across your plan's competitions.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const TOKEN = process.env.FOOTBALL_DATA_TOKEN
if (!TOKEN) { console.error('FOOTBALL_DATA_TOKEN missing'); process.exit(1) }
const COMP = (process.env.COMP || '').trim()

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

const statusOf = (s) =>
  s === 'IN_PLAY' || s === 'PAUSED' ? 'LIVE'
  : s === 'FINISHED' ? 'FINISHED'
  : s === 'POSTPONED' || s === 'SUSPENDED' || s === 'CANCELLED' ? 'POSTPONED'
  : 'SCHEDULED'

const url = COMP
  ? `https://api.football-data.org/v4/competitions/${COMP}/matches`
  : 'https://api.football-data.org/v4/matches'

const res = await fetch(url, { headers: { 'X-Auth-Token': TOKEN } })
if (!res.ok) { console.error(`API ${res.status}: ${await res.text()}`); process.exit(1) }
const { matches = [] } = await res.json()

// Keep it to today + live/recent so the page stays focused.
const batch = db.batch()
let n = 0
for (const m of matches) {
  const id = String(m.id)
  batch.set(db.collection('playgroundMatches').doc(id), {
    homeTeam: { name: m.homeTeam.shortName || m.homeTeam.name || 'TBD', code: m.homeTeam.tla || '', flag: '' },
    awayTeam: { name: m.awayTeam.shortName || m.awayTeam.name || 'TBD', code: m.awayTeam.tla || '', flag: '' },
    kickoff: Timestamp.fromDate(new Date(m.utcDate)),
    status: statusOf(m.status),
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    competition: m.competition?.name || COMP || '',
    lastUpdated: Timestamp.now()
  }, { merge: true })
  n++
}
batch.set(db.collection('playgroundMeta').doc('main'), {
  updatedAt: Timestamp.now(), count: n, competition: COMP || 'today'
}, { merge: true })
await batch.commit()
console.log(`playground sync ok: ${n} matches (comp=${COMP || 'today'})`)
