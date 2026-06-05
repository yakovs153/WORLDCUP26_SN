import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import type { CallableRequest } from 'firebase-functions/v2/https'

/** Throws unless the caller's email is listed in appConfig/main.adminEmails. */
async function assertAdmin(req: CallableRequest): Promise<void> {
  const email = req.auth?.token?.email
  if (!email) throw new HttpsError('unauthenticated', 'login required')
  const db = getFirestore()
  const cfg = await db.collection('appConfig').doc('main').get()
  const admins: string[] = (cfg.exists && cfg.data()?.adminEmails) || []
  if (!admins.includes(email)) throw new HttpsError('permission-denied', 'admins only')
}

type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED'

/**
 * Manually set a match's status/score (admin only). Sets `manualLock` so the
 * live poller won't overwrite it; pass `clearLock: true` to resume auto-sync.
 * A transition to FINISHED triggers onMatchFinished, which scores predictions.
 */
export const adminSetMatchScore = onCall(async (req) => {
  await assertAdmin(req)
  const { matchId, status, homeScore, awayScore, clearLock } = req.data as {
    matchId: string
    status?: MatchStatus
    homeScore?: number | null
    awayScore?: number | null
    clearLock?: boolean
  }
  if (!matchId) throw new HttpsError('invalid-argument', 'matchId required')

  const db = getFirestore()
  const ref = db.collection('matches').doc(matchId)
  if (clearLock) {
    await ref.set({ manualLock: false, lastUpdated: Timestamp.now() }, { merge: true })
    return { ok: true, unlocked: true }
  }

  const clamp = (v: number | null | undefined) =>
    v === null || v === undefined ? null : Math.max(0, Math.min(30, Math.floor(v)))

  await ref.set(
    {
      ...(status ? { status } : {}),
      homeScore: clamp(homeScore),
      awayScore: clamp(awayScore),
      manualLock: true,
      lastUpdated: Timestamp.now()
    },
    { merge: true }
  )
  return { ok: true }
})

/** Create or overwrite a match (admin only). */
export const adminUpsertMatch = onCall(async (req) => {
  await assertAdmin(req)
  const { id, home, away, kickoffMs, stage, group } = req.data as {
    id: string
    home: { name: string; code: string; flag: string }
    away: { name: string; code: string; flag: string }
    kickoffMs: number
    stage: string
    group: string | null
  }
  if (!id || !home?.code || !away?.code || !kickoffMs) {
    throw new HttpsError('invalid-argument', 'missing required fields')
  }

  const db = getFirestore()
  await db.collection('matches').doc(id).set(
    {
      homeTeam: { name: home.name, code: home.code, flag: home.flag || '' },
      awayTeam: { name: away.name, code: away.code, flag: away.flag || '' },
      kickoff: Timestamp.fromMillis(kickoffMs),
      stage: stage || 'GROUP',
      group: group || null,
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
      manualLock: true,
      lastUpdated: Timestamp.now()
    },
    { merge: true }
  )
  return { ok: true }
})
