/**
 * runPundit — lets a verified admin regenerate the AI pundit (daily recap +
 * next-match prediction tip) on demand, instead of waiting for a finished match
 * or the scheduled daily run.
 *
 * Security mirrors adminSetPassword: the caller sends their Firebase ID token in
 * the Authorization header; we verify it and require their email to be in
 * appConfig/main.adminEmails. No shared secret in the browser.
 *
 * POST  Authorization: Bearer <caller-id-token>
 */
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { generateDailyPundit } from './pundit'

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

export const runPundit = onRequest(
  { secrets: [GEMINI_API_KEY], region: 'europe-west1', cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return }
    try {
      const authHeader = String(req.header('Authorization') || '')
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (!token) { res.status(401).json({ error: 'missing token' }); return }
      const decoded = await getAuth().verifyIdToken(token)
      const callerEmail = (decoded.email || '').toLowerCase()
      if (!callerEmail) { res.status(401).json({ error: 'no email on token' }); return }

      const cfgSnap = await getFirestore().collection('appConfig').doc('main').get()
      const adminEmails: string[] = (cfgSnap.exists ? (cfgSnap.data()?.adminEmails || []) : [])
        .map((e: string) => String(e).toLowerCase())
      if (!adminEmails.includes(callerEmail)) {
        logger.warn('runPundit: non-admin attempt', { callerEmail })
        res.status(403).json({ error: 'not an admin' })
        return
      }

      const result = await generateDailyPundit(GEMINI_API_KEY.value())
      logger.info('runPundit: ok', { by: callerEmail, ...result })
      res.status(200).json({ ok: true, ...result })
    } catch (e) {
      logger.error('runPundit failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }
)
