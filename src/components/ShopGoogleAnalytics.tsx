import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useShopPlan } from '@/features/billing/useShopPlan'

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args)
  }
}

/** Bootstraps the shared gtag.js loader once, whichever GA consumer needs it first. */
function ensureGtagLoaded() {
  if (typeof window === 'undefined' || window.gtag) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  gtag('js', new Date())
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://www.googletagmanager.com/gtag/js'
  document.head.appendChild(script)
}

/**
 * A merchant's own GA4 property for their storefront — separate from the
 * platform-wide `GoogleAnalytics` component. Gated to Essentiel+ (plans.ts
 * `analytics`): a downgraded shop keeps its saved ID but stops sending it
 * data until it upgrades again, so nothing is lost by downgrading.
 */
export function ShopGoogleAnalytics({ shopId, measurementId }: { shopId: string; measurementId: string | null }) {
  const { plan } = useShopPlan(shopId)
  const location = useLocation()
  const active = !!measurementId && plan.analytics !== 'basic'

  useEffect(() => {
    if (!active || !measurementId) return
    ensureGtagLoaded()
    gtag('config', measurementId, { send_page_view: false })
  }, [active, measurementId])

  useEffect(() => {
    if (!active || !measurementId) return
    gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      send_to: measurementId,
    })
  }, [active, measurementId, location.pathname, location.search])

  return null
}
