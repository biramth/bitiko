/**
 * Thin wrapper around the gtag.js global installed by `GoogleAnalytics`.
 * Every function is a no-op when GA isn't loaded (no VITE_GA_MEASUREMENT_ID,
 * or a test/SSR environment without `window`), so callers never need to
 * guard themselves.
 */

type EventParams = Record<string, string | number | boolean | undefined>

/** Fire a GA4 custom event (funnel step, business metric…). */
export function trackEvent(name: string, params?: EventParams): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', name, params ?? {})
}

/**
 * Report a caught error. Kept provider-agnostic on purpose: it surfaces to the
 * console and as a non-fatal GA4 `exception` event. Swap in Sentry/Logflare
 * here later without touching every call site.
 */
export function reportError(error: unknown, context?: string): void {
  const description = error instanceof Error ? error.message : String(error)
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'exception', {
      description: context ? `${context}: ${description}` : description,
      fatal: false,
    })
  }
  console.error(context ? `[${context}]` : 'Unhandled error:', error)
}
