/**
 * Thin, provider-agnostic wrapper: fires to every analytics provider that's
 * actually loaded (GA4 via `window.gtag`, PostHog via `window.posthogCapture`
 * — see `src/lib/posthog.ts` for why it's a global instead of an import
 * here), and is a no-op for whichever isn't (no measurement ID/key, or a
 * test/SSR environment without `window`). Callers never need to guard
 * themselves or care which providers are configured.
 */

type EventParams = Record<string, string | number | boolean | undefined>

/** Fire a custom event (funnel step, business metric…) to every loaded provider. */
export function trackEvent(name: string, params?: EventParams): void {
  if (typeof window === 'undefined') return
  if (typeof window.gtag === 'function') window.gtag('event', name, params ?? {})
  if (typeof window.posthogCapture === 'function') window.posthogCapture(name, params)
}

/**
 * Report a caught error. Surfaces to the console always, and as a non-fatal
 * event to every loaded provider.
 */
export function reportError(error: unknown, context?: string): void {
  const description = error instanceof Error ? error.message : String(error)
  const label = context ? `${context}: ${description}` : description
  if (typeof window !== 'undefined') {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'exception', { description: label, fatal: false })
    }
    if (typeof window.posthogCapture === 'function') {
      window.posthogCapture('exception', { description: label })
    }
  }
  console.error(context ? `[${context}]` : 'Unhandled error:', error)
}
