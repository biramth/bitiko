import { useQuery } from '@tanstack/react-query'
import { getShop } from '@/services/shop.service'

export function useShop() {
  return useQuery({
    queryKey: ['shop'],
    queryFn: getShop,
    staleTime: 5 * 60_000,
  })
}
