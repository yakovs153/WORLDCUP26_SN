/**
 * Predictions backup — dumps every prediction (joined with user + match) to a
 * CSV file. Run by the daily backup GitHub Action; the CSV is uploaded as a
 * (private, 90-day) workflow artifact. Same keyless auth as the live sync.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFileSync } from 'node:fs'

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

const [pSnap, uSnap, mSnap] = await Promise.all([
  db.collection('predictions').get(),
  db.collection('users').get(),
  db.collection('matches').get()
])

const users = new Map(uSnap.docs.map((d) => [d.id, d.data()]))
const matches = new Map(mSnap.docs.map((d) => [d.id, d.data()]))

const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
const headers = ['uid', 'name', 'email', 'department', 'matchId', 'match', 'kickoff', 'homeScore', 'awayScore', 'points', 'auto']
const lines = [headers.join(',')]

for (const d of pSnap.docs) {
  const x = d.data()
  const u = users.get(x.uid) || {}
  const m = matches.get(x.matchId)
  lines.push([
    x.uid, u.displayName, u.email, u.department, x.matchId,
    m ? `${m.homeTeam?.name} - ${m.awayTeam?.name}` : '',
    m?.kickoff ? m.kickoff.toDate().toISOString() : '',
    x.homeScore, x.awayScore, x.points, x.auto ? '1' : ''
  ].map(esc).join(','))
}

writeFileSync('predictions-backup.csv', '﻿' + lines.join('\r\n'))
console.log(`exported ${pSnap.size} predictions`)
