import { Navigate, Outlet } from 'react-router-dom'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { usePlatformRole } from '@/features/platform/usePlatformRole'
import { PageLoader } from '@/components/ui/PageLoader'

/** Gates the merchant dashboard: a session alone isn't enough, they also
 *  need to have finished onboarding (created their shop). Platform staff
 *  without a shop go to the backoffice instead of a dead-end onboarding. */
export function RequireShop() {
  const { data: shop, isLoading } = useMyShop()
  const { data: role, isPending: rolePending } = usePlatformRole()

  if (isLoading || rolePending) return <PageLoader />
  if (!shop) return <Navigate to={role ? '/plateforme' : '/admin/onboarding'} replace />

  return <Outlet />
}
