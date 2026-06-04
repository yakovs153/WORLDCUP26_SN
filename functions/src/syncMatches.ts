import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { fetchAllMatches, footballToken, mapStage, mapStatus, teamFlag } from './footballApi'

async function runSync() {
  const token = process.env.FOOTBALL_DATA_TOKEN || footballToken.value()
  if (!token) {
    logger.warn('FOOTBALL_DATA_TOKEN is not set; skipping sync')
    return { synced: 0 }
  }

  const matches = await fetchAllMatches(token)
  const db = getFirestore()
  const batch = db.batch()

  for (const m of matches) {
    const ref = db.collection('matches').doc(String(m.id))
    batch.set(
      ref,
      {
        homeTeam: {
          name: m.homeTeam.shortName || m.homeTeam.name,
          code: m.homeTeam.tla || '',
          flag: teamFlag(m.homeTeam.crest)
        },
        awayTeam: {
          name: m.awayTeam.shortName || m.awayTeam.name,
          code: m.awayTeam.tla || '',
          flag: teamFlag(m.awayTeam.crest)
        },
        kickoff: Timestamp.fromDate(new Date(m.utcDate)),
        stage: mapStage(m.stage),
        group: m.group ? m.group.replace('GROUP_', '') : null,
        status: mapStatus(m.status),
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        lastUpdated: Timestamp.now()
      },
      { merge: true }
    )
  }

  await batch.commit()
  logger.info(`Synced ${matches.length} matches`)
  return { synced: matches.length }
}

// כל 6 שעות מסונכרן לוח המשחקים המלא
export const syncMatches = onSchedule(
  { schedule: 'every 6 hours', timeZone: 'Asia/Jerusalem', secrets: [footballToken] },
  async () => {
    await runSync()
  }
)

// טריגר ידני לבדיקה (קריאת GET): https://<region>-<project>.cloudfunctions.net/syncMatchesNow
export const syncMatchesNow = onRequest({ secrets: [footballToken] }, async (_req, res) => {
  try {
    const r = await runSync()
    res.status(200).json(r)
  } catch (e) {
    logger.error('sync failed', e)
    res.status(500).json({ error: String(e) })
  }
})
