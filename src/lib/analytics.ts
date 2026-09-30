import { hasConsented } from '@/lib/cookieConsent'

/**
 * Thin, provider-agnostic wrapper: fires to PostHog via
 * `window.posthogCapture` (see `src/lib/posthog.ts` for why it's a global
 * instead of an import here), and is a no-op when PostHog isn't loaded or
 * when the visitor hasn't consented to measurement (see
 * `src/lib/cookieConsent.ts`). Callers never need to guard themselves.
 */

type EventParams = Record<string, string | number | boolean | undefined>

/** Fire a custom event (funnel step, business metric…) to every loaded provider. */
export function trackEvent(name: string, params?: EventParams): void {
  if (typeof window === 'undefined') return
  if (!hasConsented()) return
  if (typeof window.posthogCapture === 'function') window.posthogCapture(name, params)
}

/**
 * Report a caught error. Surfaces to the console always, and as a non-fatal
 * event to every loaded provider (with consent).
 */
export function reportError(error: unknown, context?: string): void {
  const description = error instanceof Error ? error.message : String(error)
  const label = context ? `${context}: ${description}` : description
  if (typeof window !== 'undefined' && hasConsented()) {
    if (typeof window.posthogCapture === 'function') {
      window.posthogCapture('exception', { description: label })
    }
  }
  console.error(context ? `[${context}]` : 'Unhandled error:', error)
}
