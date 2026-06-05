import { doc, setDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db, DEMO_MODE, auth } from '../firebase'
import { setDemoProfile } from './demoData'

/** Update the user's display name (own profile). Firestore rules allow self-edit. */
export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  const name = displayName.trim().slice(0, 40)
  if (!name) throw new Error('שם לא יכול להיות ריק')
  if (DEMO_MODE) { setDemoProfile({ displayName: name }); return }
  await setDoc(doc(db, 'users', uid), { displayName: name }, { merge: true })
  if (auth.currentUser) { try { await updateProfile(auth.currentUser, { displayName: name }) } catch { /* non-fatal */ } }
}

/** Update the user's avatar (stored as a small data URL on the user doc). */
export async function updatePhoto(uid: string, photoURL: string): Promise<void> {
  if (DEMO_MODE) { setDemoProfile({ photoURL }); return }
  await setDoc(doc(db, 'users', uid), { photoURL }, { merge: true })
}

/** Resize/crop an image File to a square data URL (default 160px, JPEG) — keeps docs tiny. */
export function fileToAvatarDataUrl(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('תמונה לא תקינה'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas לא נתמך'))
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
