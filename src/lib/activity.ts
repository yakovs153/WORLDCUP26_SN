import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, DEMO_MODE } from '../firebase'

/** Canonical action types — keep this list short so the admin filter UI stays useful. */
export type ActivityAction =
  | 'login'
  | 'register'
  | 'prediction_save'
  | 'bonus_save'
  | 'survey_submit'
  | 'room_message'
  | 'profile_name'
  | 'profile_photo'
  | 'department_set'
  | 'king_message'
  | 'admin_delete_user'
  | 'admin_config_change'
  | 'admin_unblock_email'

/** Log a user activity event. Fire-and-forget; failures never break the calling
 *  action. Demo mode is a no-op (no real backend). Each call is one Firestore
 *  write — ~$0/month at our scale. */
export function logActivity(action: ActivityAction, context: Record<string, unknown> = {}): void {
  if (DEMO_MODE) return
  const u = auth.currentUser
  if (!u) return
  const ctx: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(context)) {
    // Keep payload small + stringy — avoids accidental large objects.
    if (v == null) continue
    ctx[k] = typeof v === 'object' ? JSON.stringify(v).slice(0, 200) : String(v).slice(0, 200)
  }
  void addDoc(collection(db, 'userActivity'), {
    uid: u.uid,
    userName: u.displayName || u.email || 'משתמש',
    action,
    context: ctx,
    page: typeof window !== 'undefined' ? window.location.hash || '/' : '',
    timestamp: serverTimestamp()
  }).catch(() => { /* swallow — activity logs should never break a user flow */ })
}
