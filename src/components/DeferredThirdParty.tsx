import { Suspense, lazy, useEffect, useState } from 'react'
import { CONSENT_CHANGED_EVENT, hasConsented, type ConsentRecord } from '@/lib/cookieConsent'

const VercelAnalytics = lazy(() =>
  import('@vercel/analytics/react').then((m) => ({ default: m.Analytics })),
)
const SpeedInsights = lazy(() =>
  import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights })),
)
const PostHogTracking = lazy(() =>
  import('@/components/PostHogTracking').then((m) => ({ default: m.PostHogTracking })),
)

/** Third-party beacons (Vercel Analytics/Speed Insights, PostHog) load after
 *  the page is interactive — never in the LCP/FCP critical path. Split into
 *  their own chunks (lazy) and mounted once the browser idles (or after a
 *  bounded timeout). Rendered inside BrowserRouter + AuthProvider (see
 *  main.tsx) — PostHogTracking needs both.
 *
 *  CNIL: nothing loads without prior consent (see `src/lib/cookieConsent.ts`
 *  and `CookieBanner`). A later "accept" mounts them without a reload; a
 *  withdrawal reloads the page (see `CookieBanner`) so loaded beacons stop. */
export function DeferredThirdParty() {
  const [consented, setConsented] = useState(() => hasConsented())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const onChanged = (e: Event) => {
      setConsented((e as CustomEvent<ConsentRecord>).detail.status === 'accepted')
    }
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged)
  }, [])

  useEffect(() => {
    if (!consented || typeof window === 'undefined') return
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = window.setTimeout(() => setReady(true), 2500)
    return () => window.clearTimeout(t)
  }, [consented])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <VercelAnalytics />
      <SpeedInsights />
      <PostHogTracking />
    </Suspense>
  )
}
