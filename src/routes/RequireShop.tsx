import { Navigate, Outlet } from 'react-router-dom'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { PageLoader } from '@/components/ui/PageLoader'

/** Gates the merchant dashboard: a session alone isn't enough, they also
 * need to have finished onboarding (created their shop). */
export function RequireShop() {
  const { data: shop, isLoading } = useMyShop()

  if (isLoading) return <PageLoader />
  if (!shop) return <Navigate to="/admin/onboarding" replace />

  return <Outlet />
}
