import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { trackPageView } from '@/lib/selfAnalytics'

/**
 * Records a page view on every navigation into our own `page_views` table.
 * Renders nothing; see src/lib/selfAnalytics.ts for the recording rules and
 * Supabase migration 0033 for the RLS + aggregation RPCs.
 *
 * Skips the merchant back-office (/admin/*, /super-admin) entirely — this
 * exists to measure who visits the marketing site and the storefronts, not
 * how a signed-in merchant clicks around their own dashboard. Without this,
 * every "top pages"/"top referrers" report on /super-admin was dominated by
 * internal admin navigation instead of real visitor traffic.
 */
export function SelfAnalytics() {
  const location = useLocation()
  const { shop } = useTenant()
  const shopId = shop?.id ?? null
  const isBackOffice = location.pathname === '/admin' || location.pathname.startsWith('/admin/') || location.pathname.startsWith('/super-admin')

  useEffect(() => {
    if (isBackOffice) return
    trackPageView({ path: location.pathname + location.search, shopId })
  }, [location.pathname, location.search, shopId, isBackOffice])

  return null
}
