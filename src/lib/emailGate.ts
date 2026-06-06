/**
 * Email gate — restricts login/signup to users with emails in `allowedEmailDomains`
 * and rejects any address in `blockedEmails`. Empty allow-list = no domain restriction.
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

function readCache(): { allowedEmailDomains: string[]; blockedEmails: string[] } {
  if (DEMO_MODE) {
    const c = getDemoConfig()
    return { allowedEmailDomains: c.allowedEmailDomains || [], blockedEmails: c.blockedEmails || [] }
  }
  try {
    const raw = localStorage.getItem(FIRESTORE_CACHE_KEY)
    if (!raw) return { allowedEmailDomains: [], blockedEmails: [] }
    const parsed = JSON.parse(raw)
    return {
      allowedEmailDomains: Array.isArray(parsed.allowedEmailDomains) ? parsed.allowedEmailDomains : [],
      blockedEmails: Array.isArray(parsed.blockedEmails) ? parsed.blockedEmails : []
    }
  } catch { return { allowedEmailDomains: [], blockedEmails: [] } }
}

export function checkEmailAllowed(email: string): EmailGateResult {
  const lc = (email || '').trim().toLowerCase()
  const idx = lc.indexOf('@')
  if (idx < 0) return { allowed: false, domain: null, reason: 'invalid-email' }
  const domain = lc.slice(idx + 1)
  const { allowedEmailDomains, blockedEmails } = readCache()
  if (blockedEmails.map((e) => e.toLowerCase()).includes(lc)) {
    return { allowed: false, domain, reason: 'blocked' }
  }
  const allowed = allowedEmailDomains.map((d) => d.toLowerCase().replace(/^@/, ''))
  if (allowed.length === 0) return { allowed: true, domain }
  const ok = allowed.some((d) => domain === d || domain.endsWith('.' + d))
  return ok ? { allowed: true, domain } : { allowed: false, domain, reason: 'domain-not-allowed' }
}

export function cacheConfigForGate(allowedEmailDomains: string[], blockedEmails: string[] = []): void {
  try { localStorage.setItem(FIRESTORE_CACHE_KEY, JSON.stringify({ allowedEmailDomains, blockedEmails })) } catch { /* ignore */ }
}
