import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useAppConfig } from '../hooks/useAppConfig'
import { DEMO_MODE } from '../firebase'

/**
 * Admin access check:
 *   - In demo mode: any signed-in user is an admin (for exploration).
 *   - In production: user.email must be in config.adminEmails.
 *
 * If not admin, redirect to home.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const cfg = useAppConfig()

  if (!user) return <Navigate to="/login" replace />

  const isAdmin =
    DEMO_MODE ||
    (user.email && cfg.adminEmails && cfg.adminEmails.map((e) => e.toLowerCase()).includes(user.email.toLowerCase()))

  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

export function useIsAdmin(): boolean {
  const { user } = useAuth()
  const cfg = useAppConfig()
  if (!user) return false
  if (DEMO_MODE) return true
  if (!user.email || !cfg.adminEmails) return false
  return cfg.adminEmails.map((e) => e.toLowerCase()).includes(user.email.toLowerCase())
}
