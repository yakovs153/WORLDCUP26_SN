/**
 * adminSetPassword — lets a verified admin set ANY user's password directly,
 * without the email round-trip (corporate mail often eats Firebase reset
 * emails). The client SDK can't do this; only the Admin SDK can.
 *
 * Security: the caller must send their Firebase ID token in the Authorization
 * header. We verify it, look up the caller's email in appConfig/main.adminEmails,
 * and only then set the target user's password. No shared secret — the admin's
 * own login is the credential.
 *
 * POST  Authorization: Bearer <caller-id-token>
 * body: { targetUid: string, newPassword: string }
 */
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export const adminSetPassword = onRequest(
  { region: 'europe-west1', cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return }
    try {
      // 1) Authenticate the caller from the Bearer token.
      const authHeader = String(req.header('Authorization') || '')
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (!token) { res.status(401).json({ error: 'missing token' }); return }
      const decoded = await getAuth().verifyIdToken(token)
      const callerEmail = (decoded.email || '').toLowerCase()
      if (!callerEmail) { res.status(401).json({ error: 'no email on token' }); return }

      // 2) Authorize: caller must be in appConfig/main.adminEmails.
      const cfgSnap = await getFirestore().collection('appConfig').doc('main').get()
      const adminEmails: string[] = (cfgSnap.exists ? (cfgSnap.data()?.adminEmails || []) : [])
        .map((e: string) => String(e).toLowerCase())
      if (!adminEmails.includes(callerEmail)) {
        logger.warn('adminSetPassword: non-admin attempt', { callerEmail })
        res.status(403).json({ error: 'not an admin' })
        return
      }

      // 3) Validate input.
      const { targetUid, newPassword } = (req.body || {}) as { targetUid?: string; newPassword?: string }
      if (!targetUid || typeof targetUid !== 'string') { res.status(400).json({ error: 'targetUid required' }); return }
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        res.status(400).json({ error: 'newPassword must be at least 6 chars' }); return
      }

      // 4) Set it.
      await getAuth().updateUser(targetUid, { password: newPassword })
      logger.info('adminSetPassword: ok', { by: callerEmail, targetUid })
      res.status(200).json({ ok: true })
    } catch (e) {
      logger.error('adminSetPassword failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }
)
