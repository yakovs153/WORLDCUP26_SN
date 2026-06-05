/**
 * One-time setup: create appConfig/main with admins + allowed domain + scoring
 * defaults. Run once after creating the Firebase project & service account.
 *
 *   $env:FIREBASE_SERVICE_ACCOUNT = Get-Content sa.json -Raw   # PowerShell
 *   node scripts/init-config.mjs
 * (or set GOOGLE_APPLICATION_CREDENTIALS to the key-file path)
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const saJson = process.env.FIREBASE_SERVICE_ACCOUNT
initializeApp(saJson ? { credential: cert(JSON.parse(saJson)) } : { credential: applicationDefault() })
const db = getFirestore()

const config = {
  scoring: { exact: 5, winnerAndDiff: 3, winnerOnly: 1 },
  bonus: { champion: 20, topScorer: 15 },
  theme: { primary: '#e11d48', accent: '#f59e0b', bg: '#1a1320', surface: '#322339', text: '#f5f0f5', danger: '#ef4444' },
  navIcons: { matches: '⚽', bonus: '🏆', my: '📋', leaderboard: '📊', profile: '👤' },
  polls: [],
  playerPhotos: {},
  customPlayers: [],
  hiddenScorers: [],
  departments: ['דאטה ואנליזה', 'פיתוח', 'סיסטם', 'פרוייקטים', 'מטאור', 'המימד השביעי', 'משאבי אנוש', 'הנהלה', 'כספים', 'מוצר'],
  adminEmails: ['yakovs@storenext.co.il', 'dors@storenext.co.il'],
  allowedEmailDomains: ['storenext.co.il'],
  updatedAt: FieldValue.serverTimestamp()
}

await db.collection('appConfig').doc('main').set(config, { merge: true })
console.log('appConfig/main initialised. Admins:', config.adminEmails.join(', '))
