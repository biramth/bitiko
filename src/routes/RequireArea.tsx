import { Navigate, Outlet } from 'react-router-dom'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { canAccess, type Area } from '@/features/shop-settings/permissions'
import { PageLoader } from '@/components/ui/PageLoader'

/** Garde de route par rôle sur la boutique : un rôle sans accès retourne au tableau de bord. */
export function RequireArea({ area }: { area: Area }) {
  const { role, isLoading } = useShopRole()
  if (isLoading) return <PageLoader />
  if (!canAccess(role, area)) return <Navigate to="/admin" replace />
  return <Outlet />
}
