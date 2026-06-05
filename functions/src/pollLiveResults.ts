import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { fetchAllMatches, footballToken, mapStatus } from './footballApi'

/**
 * רץ כל 2 דקות, מעדכן רק את המשחקים שבזמן הקרוב (חלון של ±3 שעות מ-now)
 * - חוסך חיובי API.
 * - מתעדכן רק status + score, ולא הלוח כולו.
 */
export const pollLiveResults = onSchedule(
  {
    schedule: 'every 2 minutes',
    timeZone: 'Asia/Jerusalem',
    secrets: [footballToken],
    memory: '256MiB'
  },
  async () => {
    const token = process.env.FOOTBALL_DATA_TOKEN || footballToken.value()
    if (!token) {
      logger.warn('FOOTBALL_DATA_TOKEN missing')
      return
    }

    const db = getFirestore()
    const now = Date.now()
    const windowMs = 3 * 60 * 60 * 1000

    const apiMatches = await fetchAllMatches(token)
    const relevant = apiMatches.filter((m) => {
      const t = new Date(m.utcDate).getTime()
      return Math.abs(t - now) <= windowMs || m.status === 'IN_PLAY' || m.status === 'PAUSED'
    })

    if (relevant.length === 0) {
      logger.info('no live or near-kickoff matches')
      return
    }

    // Skip matches an admin has manually locked (hand-entered score/status).
    const refs = relevant.map((m) => db.collection('matches').doc(String(m.id)))
    const existing = await db.getAll(...refs)
    const locked = new Set(
      existing.filter((d) => d.exists && d.data()?.manualLock === true).map((d) => d.id)
    )

    const batch = db.batch()
    let updated = 0
    for (const m of relevant) {
      if (locked.has(String(m.id))) continue
      batch.set(
        db.collection('matches').doc(String(m.id)),
        {
          status: mapStatus(m.status),
          homeScore: m.score.fullTime.home,
          awayScore: m.score.fullTime.away,
          lastUpdated: Timestamp.now()
        },
        { merge: true }
      )
      updated++
    }
    await batch.commit()
    logger.info(`updated ${updated} matches (skipped ${locked.size} manually-locked)`)
  }
)
