import { useQuery } from '@tanstack/react-query'
import { listCategories, type CategoryKind } from '@/services/category.service'

export function useCategories(shopId: string | undefined, kind: CategoryKind = 'product') {
  return useQuery({
    queryKey: ['categories', shopId, kind],
    queryFn: () => listCategories(shopId as string, kind),
    enabled: !!shopId,
  })
}
