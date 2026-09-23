import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

// Impersonation bookkeeping for the platform team's "support access" flow.
// Two stores, each with a distinct lifetime:
//  - sessionStorage  → the operator's own session, saved right before taking
//    the merchant's (only valid in the tab that started the impersonation);
//  - localStorage    → the impersonation context (which shop, since when), so
//    the banner survives a reload while the merchant session is active.
// Both are written with try/catch — storage can be unavailable (private mode)
// and the feature must degrade to "no banner" rather than crash.

const RETURN_SESSION_KEY = 'bitiko_support_return'
const CONTEXT_KEY = 'bitiko_support_impersonation'

export interface SupportContext {
  shopId: string
  shopName: string
  shopSlug: string
  startedAt: string
}

interface SavedSession {
  access_token: string
  refresh_token: string
}

/** Save the operator's current session so it can be restored on exit. */
export function saveSupportReturnSession(session: Session | null | undefined): void {
  if (!session) return
  const saved: SavedSession = { access_token: session.access_token, refresh_token: session.refresh_token }
  try {
    sessionStorage.setItem(RETURN_SESSION_KEY, JSON.stringify(saved))
  } catch {
    // Storage unavailable — exit will fall back to a login screen.
  }
}

export function beginImpersonation(context: SupportContext): void {
  try {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(context))
  } catch {
    // Same degradation as above.
  }
}

export function getImpersonation(): SupportContext | null {
  try {
    const raw = localStorage.getItem(CONTEXT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SupportContext
    if (!parsed.shopId || !parsed.shopName) return null
    return parsed
  } catch {
    return null
  }
}

export function isImpersonating(): boolean {
  return getImpersonation() !== null
}

function readSavedSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(RETURN_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedSession>
    if (typeof parsed.access_token !== 'string' || typeof parsed.refresh_token !== 'string') return null
    return { access_token: parsed.access_token, refresh_token: parsed.refresh_token }
  } catch {
    return null
  }
}

function clearSupportKeys(): void {
  try {
    sessionStorage.removeItem(RETURN_SESSION_KEY)
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(CONTEXT_KEY)
  } catch {
    // ignore
  }
}

/**
 * Ends an impersonation session and returns the operator to the platform
 * workspace. Restores the saved session via setSession() — a purely local
 * swap that does NOT revoke the merchant's sessions on their own devices
 * (a global signOut would). If the saved tokens are gone or stale, falls back
 * to a local sign-out and the login screen (never a global one).
 */
export async function endImpersonation(): Promise<void> {
  const saved = readSavedSession()
  if (saved) {
    const { error } = await supabase.auth.setSession({ ...saved })
    if (!error) {
      clearSupportKeys()
      window.location.assign('/plateforme')
      return
    }
  }
  clearSupportKeys()
  await supabase.auth.signOut({ scope: 'local' })
  window.location.assign('/admin/login')
}