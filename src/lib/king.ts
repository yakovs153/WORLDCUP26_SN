import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, DEMO_MODE, auth } from '../firebase'
import { getDemoLeaderboard } from './demoData'

export interface KingState {
  uid: string
  name: string
  totalPoints: number
  message: string
  messageBy: string
}

const DEMO_MSG_KEY = 'demo-king-message-v1'
const DEMO_CHANGED = 'demo-king-changed'

/** Watch the current leader ("king") + their broadcast message. */
export function watchKing(cb: (k: KingState | null) => void): () => void {
  if (DEMO_MODE) {
    const refresh = () => {
      const me = auth.currentUser
      const rows = getDemoLeaderboard(me?.uid || 'me', me?.displayName || 'אני')
      const top = rows[0]
      if (!top || top.totalPoints <= 0) { cb(null); return }
      let msg: { message?: string; byUid?: string } = {}
      try { msg = JSON.parse(localStorage.getItem(DEMO_MSG_KEY) || '{}') } catch { /* ignore */ }
      cb({ uid: top.uid, name: top.displayName, totalPoints: top.totalPoints, message: msg.message || '', messageBy: msg.byUid || '' })
    }
    refresh()
    window.addEventListener('demo-predictions-changed', refresh)
    window.addEventListener(DEMO_CHANGED, refresh)
    return () => { window.removeEventListener('demo-predictions-changed', refresh); window.removeEventListener(DEMO_CHANGED, refresh) }
  }
  let king: { uid: string; name: string; totalPoints: number } | null = null
  let kmsg: { message?: string; byUid?: string } = {}
  const emit = () => cb(king ? { ...king, message: kmsg.message || '', messageBy: kmsg.byUid || '' } : null)
  const u1 = onSnapshot(doc(db, 'appState', 'king'), (s) => { king = s.exists() ? (s.data() as typeof king) : null; emit() })
  const u2 = onSnapshot(doc(db, 'appState', 'kingMessage'), (s) => { kmsg = s.exists() ? s.data() : {}; emit() })
  return () => { u1(); u2() }
}

/** The reigning king posts a short message for everyone (UI gates this to the king). */
export async function setKingMessage(uid: string, message: string): Promise<void> {
  if (DEMO_MODE) {
    localStorage.setItem(DEMO_MSG_KEY, JSON.stringify({ message, byUid: uid }))
    window.dispatchEvent(new Event(DEMO_CHANGED))
    return
  }
  await setDoc(doc(db, 'appState', 'kingMessage'), { message, byUid: uid, updatedAt: serverTimestamp() })
}
