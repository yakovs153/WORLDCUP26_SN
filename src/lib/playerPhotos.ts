import { DEMO_MODE } from '../firebase'
import { resizeImage, blobToDataUrl } from './imageUtils'
import { getDemoConfig, patchAppConfig } from './appConfig'

/**
 * Upload a player photo.
 *
 * Demo mode: resize → base64 data URL → store inside appConfig.playerPhotos in localStorage.
 * Production: resize → upload blob to Firebase Storage → store download URL in appConfig.playerPhotos.
 *
 * Note: In production, only the download URL is stored in Firestore (small),
 * the binary lives in Storage so the appConfig doc stays well under 1 MB.
 */
export async function uploadPlayerPhoto(playerName: string, file: File): Promise<void> {
  const blob = await resizeImage(file, 240, 0.85)

  if (DEMO_MODE) {
    const dataUrl = await blobToDataUrl(blob)
    const cfg = getDemoConfig()
    await patchAppConfig({ playerPhotos: { ...cfg.playerPhotos, [playerName]: dataUrl } })
    return
  }

  // Production: lazy-load Storage (keeps demo bundle smaller)
  const [{ getStorage, ref, uploadBytes, getDownloadURL }, { app }] = await Promise.all([
    import('firebase/storage'),
    import('../firebase')
  ])
  const storage = getStorage(app)
  const slug = playerName.replace(/[^\w֐-׿]+/g, '_').slice(0, 60)
  const photoRef = ref(storage, `player-photos/${slug}.jpg`)
  await uploadBytes(photoRef, blob, { contentType: 'image/jpeg' })
  const url = await getDownloadURL(photoRef)
  // We need the latest config to merge; use a get + patch
  const { getDoc, doc } = await import('firebase/firestore')
  const { db } = await import('../firebase')
  const snap = await getDoc(doc(db, 'appConfig', 'main'))
  const existing = (snap.exists() && (snap.data().playerPhotos as Record<string, string>)) || {}
  await patchAppConfig({ playerPhotos: { ...existing, [playerName]: url } })
}

export async function removePlayerPhoto(playerName: string): Promise<void> {
  if (DEMO_MODE) {
    const cfg = getDemoConfig()
    const next = { ...cfg.playerPhotos }
    delete next[playerName]
    await patchAppConfig({ playerPhotos: next })
    return
  }
  const { getDoc, doc } = await import('firebase/firestore')
  const { db } = await import('../firebase')
  const snap = await getDoc(doc(db, 'appConfig', 'main'))
  const existing = (snap.exists() && (snap.data().playerPhotos as Record<string, string>)) || {}
  const next = { ...existing }
  delete next[playerName]
  await patchAppConfig({ playerPhotos: next })
}
