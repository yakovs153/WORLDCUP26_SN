import { collection, doc, onSnapshot, query, where, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'

export interface SurveyResponse {
  uid: string
  surveyId: string
  answers: Record<string, number> // questionId -> chosen option index
}

const DEMO_KEY = 'demo-survey-responses-v1'
const CHANGED = 'demo-surveys-changed'

// demo store: surveyId -> uid -> answers
function loadDemo(): Record<string, Record<string, Record<string, number>>> {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}') } catch { return {} }
}

export async function submitSurvey(uid: string, surveyId: string, answers: Record<string, number>): Promise<void> {
  if (DEMO_MODE) {
    const all = loadDemo()
    all[surveyId] = all[surveyId] || {}
    all[surveyId][uid] = answers
    localStorage.setItem(DEMO_KEY, JSON.stringify(all))
    window.dispatchEvent(new Event(CHANGED))
    return
  }
  await setDoc(doc(db, 'surveyResponses', `${uid}_${surveyId}`), { uid, surveyId, answers, ts: serverTimestamp() })
}

/** Watch all responses for a survey (results are public). Returns unsubscribe. */
export function watchSurvey(surveyId: string, cb: (responses: SurveyResponse[]) => void): () => void {
  if (DEMO_MODE) {
    const refresh = () => {
      const m = loadDemo()[surveyId] || {}
      cb(Object.entries(m).map(([uid, answers]) => ({ uid, surveyId, answers })))
    }
    refresh()
    window.addEventListener(CHANGED, refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(CHANGED, refresh); window.removeEventListener('storage', refresh) }
  }
  return onSnapshot(query(collection(db, 'surveyResponses'), where('surveyId', '==', surveyId)), (snap) => {
    cb(snap.docs.map((d) => d.data() as SurveyResponse))
  })
}
