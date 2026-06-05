import { doc, setDoc } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { setDemoDepartment } from './demoData'

/**
 * Set a user's department. Used by the user (own profile / registration) and by
 * admins (assigning others). Firestore rules permit self-edits and admin edits.
 */
export async function setDepartment(uid: string, department: string): Promise<void> {
  if (DEMO_MODE) {
    setDemoDepartment(uid, department)
    return
  }
  await setDoc(doc(db, 'users', uid), { department }, { merge: true })
}
