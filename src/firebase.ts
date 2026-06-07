import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// DEMO_MODE turns on when EITHER the build-time env var is true OR the URL
// query string includes `?demo=1`. The URL-param path lets us share the live
// hosting URL as a demo link (`https://storenext-wc2026.web.app/?demo=1`)
// without needing a separate hosting site. Demo data lives in its own
// localStorage keys ('demo-*') so it can't pollute real user state.
const isDemoBuild = import.meta.env.VITE_DEMO_MODE === 'true'
const isDemoUrl = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1'
const isDemo = isDemoBuild || isDemoUrl

// In demo mode the real Firebase keys are empty. Firebase still initializes
// eagerly here (this module is imported by AuthProvider/useAppConfig), and
// getAuth() throws `auth/invalid-api-key` on an empty key — which crashes the
// whole app before React renders. Provide harmless placeholders so init
// succeeds; demo mode never makes real Firebase calls (all paths are guarded
// by DEMO_MODE), so these values are never used over the network.
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (isDemo ? 'demo-api-key' : undefined),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (isDemo ? 'demo.firebaseapp.com' : undefined),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (isDemo ? 'demo-project' : undefined),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (isDemo ? '1:0:web:demo' : undefined)
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
}

/**
 * Demo mode: כשמופעל, ה-hooks משתמשים ב-fixtures מקומיות
 * וניחושים נשמרים ב-localStorage. שימושי לתצוגה מקדימה ללא Firebase project.
 *
 * Activates via `VITE_DEMO_MODE=true` at build time OR `?demo=1` in the URL
 * at runtime — either path uses the same demo data.
 */
export const DEMO_MODE = isDemo
