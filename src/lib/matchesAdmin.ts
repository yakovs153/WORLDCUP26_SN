import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import type { MatchStage, MatchStatus } from '../types'
import { setDemoMatchResult, addDemoMatch } from './demoData'

export interface MatchResultPatch {
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
}

export interface NewMatchInput {
  id: string
  home: { name: string; code: string; flag: string }
  away: { name: string; code: string; flag: string }
  kickoffMs: number
  stage: MatchStage
  group: string | null
}

const clamp = (v: number | null) => (v === null ? null : Math.max(0, Math.min(30, Math.floor(v))))

/**
 * Set a match's status/score. `manualLock: true` tells the GitHub Actions
 * live-sync to leave this match alone. (Admin-only — enforced by Firestore rules.)
 * A manual FINISHED is scored by the next sync run (≤ a few minutes).
 */
export async function saveMatchResult(matchId: string, patch: MatchResultPatch): Promise<void> {
  if (DEMO_MODE) {
    setDemoMatchResult(matchId, { ...patch, manualLock: true })
    return
  }
  await setDoc(
    doc(db, 'matches', matchId),
    {
      status: patch.status,
      homeScore: clamp(patch.homeScore),
      awayScore: clamp(patch.awayScore),
      manualLock: true,
      // re-score on next sync if an admin corrects a finished result
      scored: false,
      lastUpdated: serverTimestamp()
    },
    { merge: true }
  )
}

/** Resume automatic syncing for a match (clears the manual lock). */
export async function resumeAutoSync(matchId: string): Promise<void> {
  if (DEMO_MODE) {
    setDemoMatchResult(matchId, { manualLock: false })
    return
  }
  await setDoc(doc(db, 'matches', matchId), { manualLock: false, lastUpdated: serverTimestamp() }, { merge: true })
}

/** Create (or overwrite) a match. */
export async function upsertMatch(input: NewMatchInput): Promise<void> {
  if (DEMO_MODE) {
    addDemoMatch({ ...input, status: 'SCHEDULED', homeScore: null, awayScore: null })
    return
  }
  await setDoc(
    doc(db, 'matches', input.id),
    {
      homeTeam: { name: input.home.name, code: input.home.code, flag: input.home.flag || '' },
      awayTeam: { name: input.away.name, code: input.away.code, flag: input.away.flag || '' },
      kickoff: Timestamp.fromMillis(input.kickoffMs),
      stage: input.stage,
      group: input.group,
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
      manualLock: true,
      scored: false,
      lastUpdated: serverTimestamp()
    },
    { merge: true }
  )
}
