/**
 * Predictions backup — dumps every prediction (joined with user + match) to a
 * CSV file, and bonus predictions to a separate CSV. Both are uploaded as
 * private 90-day workflow artifacts by the daily backup GitHub Action.
 * Same keyless auth as the live sync.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFileSync } from 'node:fs'

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
const db = getFirestore()

const [pSnap, uSnap, mSnap, bSnap] = await Promise.all([
  db.collection('predictions').get(),
  db.collection('users').get(),
  db.collection('matches').get(),
  db.collection('bonusPredictions').get()
])

const users = new Map(uSnap.docs.map((d) => [d.id, d.data()]))
const matches = new Map(mSnap.docs.map((d) => [d.id, d.data()]))

// Build code→team-name map from matches for the bonus CSV.
const teamName = new Map()
for (const m of matches.values()) {
  if (m.homeTeam?.code) teamName.set(m.homeTeam.code, m.homeTeam.name)
  if (m.awayTeam?.code) teamName.set(m.awayTeam.code, m.awayTeam.name)
}
const teamOf = (code) => (code && teamName.get(code)) || code || ''

const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`

// ===== predictions-backup.csv (match-by-match)
{
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
}

// ===== bonus-predictions-backup.csv (one row per user)
{
  const headers = ['uid', 'name', 'email', 'department', 'champion', 'runnerUp', 'surprise', 'flop', 'topScorer', 'awardedPoints', 'updatedAt']
  const lines = [headers.join(',')]
  for (const d of bSnap.docs) {
    const x = d.data()
    const u = users.get(x.uid) || {}
    lines.push([
      x.uid, u.displayName, u.email, u.department,
      teamOf(x.championTeamCode),
      teamOf(x.runnerUpCode),
      teamOf(x.surpriseTeamCode),
      teamOf(x.flopTeamCode),
      x.topScorer || '',
      x.awardedPoints ?? '',
      x.updatedAt?.toDate ? x.updatedAt.toDate().toISOString() : ''
    ].map(esc).join(','))
  }
  writeFileSync('bonus-predictions-backup.csv', '﻿' + lines.join('\r\n'))
  console.log(`exported ${bSnap.size} bonus predictions`)
}
