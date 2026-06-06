import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import { useAppConfig } from '../hooks/useAppConfig'
import { DEMO_MODE } from '../firebase'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const cfg = useAppConfig()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="text-muted">טוען…</div>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  // Email verification gate — admin-controlled. Demo mode bypasses (no real auth).
  if (!DEMO_MODE && cfg.features.requireEmailVerification && user.emailVerified === false) {
    return <Navigate to="/verify" replace />
  }
  return <>{children}</>
}
