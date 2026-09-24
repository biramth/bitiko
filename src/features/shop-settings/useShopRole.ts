import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { getMyShopRole, type ShopRole } from '@/services/team.service'
import { useMyShop } from './useMyShop'

/** The signed-in user's role on the current shop (owner/manager/vendeur).
 *  Drives UI gating (billing + team stay owner-only); RLS stays the real
 *  guard server-side. */
export function useShopRole() {
  const { user } = useAuth()
  const { data: shop } = useMyShop()

  const query = useQuery({
    queryKey: ['shop-role', shop?.id, user?.id],
    queryFn: () => getMyShopRole(shop, user?.id),
    enabled: !!shop?.id && !!user?.id,
    staleTime: 60_000,
  })

  const role: ShopRole | null = query.data ?? null
  return { ...query, role, isOwner: role === 'owner' }
}
