import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { trackPageView } from '@/lib/selfAnalytics'

/**
 * Records a page view on every navigation into our own `page_views` table.
 * Renders nothing; see src/lib/selfAnalytics.ts for the recording rules and
 * Supabase migration 0033 for the RLS + aggregation RPCs.
 */
export function SelfAnalytics() {
  const location = useLocation()
  const { shop } = useTenant()
  const shopId = shop?.id ?? null

  useEffect(() => {
    trackPageView({ path: location.pathname + location.search, shopId })
  }, [location.pathname, location.search, shopId])

  return null
}
