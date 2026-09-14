import { useQuery } from '@tanstack/react-query'
import { getMyShop } from '@/services/shop.service'
import { useAuth } from '@/features/auth/AuthContext'

/** The shop owned by the currently logged-in merchant (admin dashboard). */
export function useMyShop() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-shop', user?.id],
    queryFn: () => getMyShop(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })
}
