import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'

export interface RoomMsg {
  id: string
  uid: string
  name: string
  text?: string
  emoji?: string
  ts: number
}

const demoKey = (matchId: string) => `demo-room-${matchId}`
const demoEvent = (matchId: string) => `demo-room-changed-${matchId}`

function loadDemo(matchId: string): RoomMsg[] {
  try { return JSON.parse(localStorage.getItem(demoKey(matchId)) || '[]') } catch { return [] }
}

export async function sendRoomMessage(matchId: string, uid: string, name: string, payload: { text?: string; emoji?: string }): Promise<void> {
  if (!payload.text && !payload.emoji) return
  if (DEMO_MODE) {
    const list = loadDemo(matchId)
    list.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, uid, name, ...payload, ts: Date.now() })
    localStorage.setItem(demoKey(matchId), JSON.stringify(list.slice(-200)))
    window.dispatchEvent(new Event(demoEvent(matchId)))
    return
  }
  await addDoc(collection(db, 'matches', matchId, 'chat'), {
    uid, name, text: payload.text ?? null, emoji: payload.emoji ?? null, ts: serverTimestamp()
  })
}

export function watchRoom(matchId: string, cb: (msgs: RoomMsg[]) => void): () => void {
  if (DEMO_MODE) {
    const refresh = () => cb(loadDemo(matchId))
    refresh()
    window.addEventListener(demoEvent(matchId), refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(demoEvent(matchId), refresh); window.removeEventListener('storage', refresh) }
  }
  const q = query(collection(db, 'matches', matchId, 'chat'), orderBy('ts', 'asc'), limit(200))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => {
      const data = d.data() as { uid: string; name: string; text?: string; emoji?: string; ts?: Timestamp }
      return { id: d.id, uid: data.uid, name: data.name, text: data.text || undefined, emoji: data.emoji || undefined, ts: data.ts?.toMillis?.() ?? 0 }
    }))
  })
}
