import { collection, doc, getDocs, writeBatch, Timestamp } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import scheduleData from '../data/wc2026.json'

interface ScheduleMatch {
  id: string
  home: { name: string; code: string; flag: string }
  away: { name: string; code: string; flag: string }
  kickoff: string
  stage: string
  group: string | null
  status: string
  homeScore: number | null
  awayScore: number | null
}

/**
 * Import the official 104-match schedule into Firestore — run once by an admin
 * (writes are allowed for admin emails by the rules). Avoids needing a
 * service-account key. Existing matches that already have a score keep it
 * (only fixtures/teams/kickoff are refreshed), so a re-import won't wipe results.
 */
export async function importOfficialSchedule(): Promise<number> {
  if (DEMO_MODE) return 0 // demo already uses the bundled schedule
  const matches = (scheduleData as { matches: ScheduleMatch[] }).matches

  const existing = new Map<string, { homeScore: number | null }>()
  const snap = await getDocs(collection(db, 'matches'))
  snap.forEach((d) => existing.set(d.id, { homeScore: (d.data() as { homeScore: number | null }).homeScore }))

  let count = 0
  // Firestore batches cap at 500 writes.
  for (let i = 0; i < matches.length; i += 400) {
    const batch = writeBatch(db)
    for (const m of matches.slice(i, i + 400)) {
      const played = existing.get(m.id)?.homeScore != null
      const base = {
        homeTeam: m.home,
        awayTeam: m.away,
        kickoff: Timestamp.fromDate(new Date(m.kickoff)),
        stage: m.stage,
        group: m.group,
        lastUpdated: Timestamp.now()
      }
      // Don't clobber a score that's already been recorded.
      const payload = played ? base : { ...base, status: m.status, homeScore: m.homeScore, awayScore: m.awayScore }
      batch.set(doc(db, 'matches', m.id), payload, { merge: true })
      count++
    }
    await batch.commit()
  }
  return count
}
