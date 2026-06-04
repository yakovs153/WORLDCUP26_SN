/**
 * Email domain gate — restricts login/signup to users with emails in `allowedEmailDomains`.
 *
 * If the list is empty, no restriction is applied (any email allowed).
 *
 * In demo mode we use the cached config from localStorage so the gate works
 * even before AuthProvider has access to the live useAppConfig context.
 */
import { DEMO_MODE } from '../firebase'
import { getDemoConfig } from './appConfig'

const FIRESTORE_CACHE_KEY = 'app-config-cache-v1' // populated by useAppConfig on first load

export interface EmailGateResult {
  allowed: boolean
  domain: string | null
  reason?: string
}

function getAllowedDomains(): string[] {
  if (DEMO_MODE) return getDemoConfig().allowedEmailDomains || []
  // For production, useAppConfig writes its latest snapshot to this key.
  try {
    const raw = localStorage.getItem(FIRESTORE_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.allowedEmailDomains) ? parsed.allowedEmailDomains : []
  } catch {
    return []
  }
}

export function checkEmailAllowed(email: string): EmailGateResult {
  const lc = (email || '').trim().toLowerCase()
  const idx = lc.indexOf('@')
  if (idx < 0) return { allowed: false, domain: null, reason: 'invalid-email' }
  const domain = lc.slice(idx + 1)
  const allowed = getAllowedDomains().map((d) => d.toLowerCase().replace(/^@/, ''))
  if (allowed.length === 0) return { allowed: true, domain }
  const ok = allowed.some((d) => domain === d || domain.endsWith('.' + d))
  return ok
    ? { allowed: true, domain }
    : { allowed: false, domain, reason: 'domain-not-allowed' }
}

export function cacheConfigForGate(allowedEmailDomains: string[]): void {
  try {
    localStorage.setItem(FIRESTORE_CACHE_KEY, JSON.stringify({ allowedEmailDomains }))
  } catch {
    /* ignore */
  }
}
