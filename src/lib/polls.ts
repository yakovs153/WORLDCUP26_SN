import { doc, getDoc, increment, setDoc } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'

/**
 * Vote storage:
 *   - Demo: localStorage keys
 *       'demo-poll-vote-<pollId>'         = optionId (the user's pick)
 *       'demo-poll-tally-<pollId>'        = JSON {optionId: count}
 *   - Production:
 *       /pollVotes/{uid}_{pollId} = { optionId, uid, pollId, votedAt }
 *       Cloud Function aggregates → /pollTally/{pollId}.optionCounts (denormalized for fast reads).
 *       For simplicity here we use a `pollTally/{pollId}` doc and the client increments it.
 */

const VOTE_KEY = (pollId: string) => `demo-poll-vote-${pollId}`
const TALLY_KEY = (pollId: string) => `demo-poll-tally-${pollId}`

export interface PollTally {
  [optionId: string]: number
}

export function getMyVote(pollId: string, _uid: string): string | null {
  if (DEMO_MODE) return localStorage.getItem(VOTE_KEY(pollId))
  // For production this is async; PollCard will call getMyVoteAsync below.
  return null
}

export async function getMyVoteAsync(pollId: string, uid: string): Promise<string | null> {
  if (DEMO_MODE) return localStorage.getItem(VOTE_KEY(pollId))
  const snap = await getDoc(doc(db, 'pollVotes', `${uid}_${pollId}`))
  return snap.exists() ? (snap.data().optionId as string) : null
}

export async function getTally(pollId: string): Promise<PollTally> {
  if (DEMO_MODE) {
    try {
      const raw = localStorage.getItem(TALLY_KEY(pollId))
      if (!raw) return {}
      return JSON.parse(raw) as PollTally
    } catch {
      return {}
    }
  }
  const snap = await getDoc(doc(db, 'pollTally', pollId))
  return snap.exists() ? ((snap.data().optionCounts as PollTally) || {}) : {}
}

export async function castVote(pollId: string, uid: string, optionId: string): Promise<void> {
  if (DEMO_MODE) {
    // Prevent double-voting in demo
    const existing = localStorage.getItem(VOTE_KEY(pollId))
    if (existing) return
    localStorage.setItem(VOTE_KEY(pollId), optionId)
    const tally = await getTally(pollId)
    tally[optionId] = (tally[optionId] || 0) + 1
    // Seed some fake votes on first real vote so chart looks alive
    if (Object.keys(tally).length === 1) {
      // no-op; we keep the tally simple
    }
    localStorage.setItem(TALLY_KEY(pollId), JSON.stringify(tally))
    window.dispatchEvent(new Event('demo-poll-changed'))
    return
  }
  // Production: write the vote + bump tally
  await setDoc(doc(db, 'pollVotes', `${uid}_${pollId}`), {
    uid,
    pollId,
    optionId,
    votedAt: Date.now()
  })
  await setDoc(
    doc(db, 'pollTally', pollId),
    { optionCounts: { [optionId]: increment(1) } },
    { merge: true }
  )
}
