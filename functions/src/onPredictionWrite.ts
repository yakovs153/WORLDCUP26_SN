import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

// כשמתווסף ניחוש חדש - מעדכנים predictionsCount של המשתמש.
// (עדכון ניחוש קיים לא משנה את הספירה.)
export const onPredictionCreated = onDocumentCreated('predictions/{id}', async (event) => {
  const data = event.data?.data()
  if (!data?.uid) return
  const db = getFirestore()
  await db
    .collection('users')
    .doc(data.uid)
    .set({ predictionsCount: FieldValue.increment(1) }, { merge: true })
})

export const onPredictionDeleted = onDocumentDeleted('predictions/{id}', async (event) => {
  const data = event.data?.data()
  if (!data?.uid) return
  const db = getFirestore()
  await db
    .collection('users')
    .doc(data.uid)
    .set({ predictionsCount: FieldValue.increment(-1) }, { merge: true })
})
