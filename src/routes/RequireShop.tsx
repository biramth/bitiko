import { Navigate, Outlet } from 'react-router-dom'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { Spinner } from '@/components/ui/Spinner'

/** Gates the merchant dashboard: a session alone isn't enough, they also
 * need to have finished onboarding (created their shop). */
export function RequireShop() {
  const { data: shop, isLoading } = useMyShop()

  if (isLoading) return <Spinner />
  if (!shop) return <Navigate to="/admin/onboarding" replace />

  return <Outlet />
}
