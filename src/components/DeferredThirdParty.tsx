import { Suspense, lazy, useEffect, useState } from 'react'

const VercelAnalytics = lazy(() =>
  import('@vercel/analytics/react').then((m) => ({ default: m.Analytics })),
)
const SpeedInsights = lazy(() =>
  import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights })),
)

/** Third-party beacons load after the page is interactive — never in the
 *  LCP/FCP critical path. Split into their own chunks (lazy) and mounted
 *  once the browser idles (or after a bounded timeout). */
export function DeferredThirdParty() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = window.setTimeout(() => setReady(true), 2500)
    return () => window.clearTimeout(t)
  }, [])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <VercelAnalytics />
      <SpeedInsights />
    </Suspense>
  )
}
