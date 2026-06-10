import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  type User
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, DEMO_MODE } from '../firebase'
import { checkEmailAllowed } from '../lib/emailGate'
import { setDemoDepartment } from '../lib/demoData'
import { logActivity } from '../lib/activity'

class EmailGateError extends Error {
  code = 'email-gate'
}

function gateEmail(email: string | null | undefined): void {
  const result = checkEmailAllowed(email || '')
  if (!result.allowed) {
    throw new EmailGateError(
      result.reason === 'invalid-email'
        ? 'אימייל לא תקין'
        : 'ההרשמה פתוחה רק לעובדי החברה — יש להתחבר עם כתובת אימייל ארגונית'
    )
  }
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  signInEmail: (email: string, password: string) => Promise<void>
  registerEmail: (email: string, password: string, displayName: string, department?: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resendVerification: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function ensureUserDoc(user: User, displayNameOverride?: string, department?: string) {
  if (DEMO_MODE) return
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    // keep department in sync if provided (e.g. picked at registration)
    if (department) await setDoc(ref, { department }, { merge: true })
    return
  }
  await setDoc(ref, {
    uid: user.uid,
    displayName: displayNameOverride || user.displayName || user.email?.split('@')[0] || 'משתמש',
    email: user.email || '',
    photoURL: user.photoURL || null,
    department: department || null,
    totalPoints: 0,
    predictionsCount: 0,
    joinedAt: serverTimestamp()
  })
}

// ===== Demo mode: fake user persisted in localStorage =====
const DEMO_USER_KEY = 'demo-user-v1'

function loadDemoUser(): User | null {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function saveDemoUser(u: User | null) {
  if (u) localStorage.setItem(DEMO_USER_KEY, JSON.stringify(u))
  else localStorage.removeItem(DEMO_USER_KEY)
}

function makeDemoUser(email: string, displayName?: string): User {
  // Minimal shape — enough for our code's needs (uid, email, displayName, photoURL)
  return {
    uid: 'demo-' + (email || 'user').replace(/[^a-z0-9]/gi, '').slice(0, 12),
    email,
    displayName: displayName || email.split('@')[0] || 'משתמש דמו',
    photoURL: null
  } as unknown as User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_MODE) {
      let u = loadDemoUser()
      // Demo quick-entry: `?demo=1` (or any value) signs in a sample user so the
      // app is instantly previewable without typing. `?sim=1` also seeds sample
      // predictions on the showcase matches. Demo mode only.
      try {
        const params = new URLSearchParams(window.location.search)
        const p = params.get('demo')
        if (!u && p) {
          u = makeDemoUser(p.includes('@') ? p : 'demo.user@storenext.com', 'משתמש דמו')
          saveDemoUser(u)
        }
        if (params.get('sim')) {
          void import('../lib/demoData').then((m) => m.seedDemoSimulation())
        }
      } catch { /* ignore */ }
      setUser(u)
      setLoading(false)
      return
    }
    return onAuthStateChanged(
      auth,
      (u) => {
        setUser(u)
        setLoading(false)
      },
      (err) => {
        console.error('Auth state error:', err)
        setUser(null)
        setLoading(false)
      }
    )
  }, [])

  const signInEmail = async (email: string, password: string) => {
    gateEmail(email)
    if (DEMO_MODE) {
      if (!email || password.length < 1) throw new Error('auth/invalid-credential')
      const u = makeDemoUser(email)
      saveDemoUser(u)
      setUser(u)
      return
    }
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await ensureUserDoc(cred.user)
    logActivity('login', { method: 'email' })
  }

  const registerEmail = async (email: string, password: string, displayName: string, department?: string) => {
    gateEmail(email)
    if (DEMO_MODE) {
      if (!email || password.length < 6) throw new Error('auth/weak-password')
      const u = makeDemoUser(email, displayName)
      saveDemoUser(u)
      if (department) setDemoDepartment(u.uid, department)
      setUser(u)
      return
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) await updateProfile(cred.user, { displayName })
    await ensureUserDoc(cred.user, displayName, department)
    logActivity('register', { department: department || '' })
    // Email verification — send a verification email; ProtectedRoute will gate
    // access until the user clicks the link and the auth token reloads.
    try { await sendEmailVerification(cred.user) } catch (e) { console.warn('sendEmailVerification failed:', e) }
  }

  const signInGoogle = async () => {
    if (DEMO_MODE) {
      gateEmail('demo.user@storenext.com')
      const u = makeDemoUser('demo.user@storenext.com', 'משתמש דמו')
      saveDemoUser(u)
      setUser(u)
      return
    }
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    try {
      gateEmail(cred.user.email)
    } catch (e) {
      // Email isn't allowed — sign out immediately and propagate
      await fbSignOut(auth)
      throw e
    }
    await ensureUserDoc(cred.user)
  }

  const signOut = async () => {
    if (DEMO_MODE) {
      saveDemoUser(null)
      setUser(null)
      return
    }
    await fbSignOut(auth)
  }

  const resendVerification = async () => {
    if (DEMO_MODE) return
    if (!auth.currentUser) throw new Error('not signed in')
    await sendEmailVerification(auth.currentUser)
  }

  const resetPassword = async (email: string) => {
    if (DEMO_MODE) return  // pretend it worked in demo mode
    const clean = email.trim()
    if (!clean) throw new Error('יש להזין כתובת אימייל')
    await sendPasswordResetEmail(auth, clean)
  }

  const refreshUser = async () => {
    if (DEMO_MODE) return
    if (!auth.currentUser) return
    await reload(auth.currentUser)
    setUser({ ...(auth.currentUser as User) }) // force re-render via new object
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInEmail, registerEmail, signInGoogle, signOut, resendVerification, resetPassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
