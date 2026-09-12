import { useQuery } from '@tanstack/react-query'
import { listCategories } from '@/services/category.service'

export function useCategories(shopId: string | undefined) {
  return useQuery({
    queryKey: ['categories', shopId],
    queryFn: () => listCategories(shopId as string),
    enabled: !!shopId,
  })
}
