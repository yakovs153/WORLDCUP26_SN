import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()
setGlobalOptions({ region: 'europe-west1' })

export { syncMatches, syncMatchesNow } from './syncMatches'
export { pollLiveResults } from './pollLiveResults'
export { onMatchFinished } from './onMatchFinished'
export { onPredictionCreated, onPredictionDeleted } from './onPredictionWrite'
export { adminSetMatchScore, adminUpsertMatch } from './adminMatches'
