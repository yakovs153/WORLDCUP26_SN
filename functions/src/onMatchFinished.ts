import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { scorePrediction } from './scoring'

/**
 * כשמשחק עובר ל-FINISHED עם תוצאה: סורק את כל הניחושים למשחק זה,
 * מחשב נקודות לכל ניחוש, ומעדכן את totalPoints של כל משתמש בעסקה אטומית.
 *
 * idempotent: אם points כבר חושב (לא null) — מדלגים. אם הפונקציה תרוץ שוב,
 * לא נכפיל נקודות.
 */
export const onMatchFinished = onDocumentUpdated('matches/{matchId}', async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after) return

  const becameFinished = before.status !== 'FINISHED' && after.status === 'FINISHED'
  if (!becameFinished) return

  if (typeof after.homeScore !== 'number' || typeof after.awayScore !== 'number') {
    logger.warn('match finished but score missing', { matchId: event.params.matchId })
    return
  }

  const db = getFirestore()
  const matchId = event.params.matchId

  const predsSnap = await db.collection('predictions').where('matchId', '==', matchId).get()
  if (predsSnap.empty) {
    logger.info('no predictions for finished match', { matchId })
    return
  }

  // Aggregate per-user delta to update users in batches
  const userDelta = new Map<string, number>()

  await db.runTransaction(async (tx) => {
    for (const doc of predsSnap.docs) {
      const p = doc.data()
      if (p.points !== null && p.points !== undefined) continue // already scored

      const pts = scorePrediction(p.homeScore, p.awayScore, after.homeScore, after.awayScore)
      tx.update(doc.ref, { points: pts })
      userDelta.set(p.uid, (userDelta.get(p.uid) || 0) + pts)
    }

    for (const [uid, delta] of userDelta) {
      const userRef = db.collection('users').doc(uid)
      tx.set(
        userRef,
        { totalPoints: FieldValue.increment(delta) },
        { merge: true }
      )
    }
  })

  logger.info('scored predictions', { matchId, userCount: userDelta.size })
})
