import { useQuery } from '@tanstack/react-query'
import {
  getProductBySlug,
  listActiveProducts,
  listShopProducts,
  type ProductFilters,
} from '@/services/product.service'

export function useActiveProducts(filters: ProductFilters | null) {
  return useQuery({
    queryKey: ['products', 'active', filters],
    queryFn: () => listActiveProducts(filters as ProductFilters),
    enabled: !!filters?.shopId,
  })
}

export function useProduct(shopId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ['product', shopId, slug],
    queryFn: () => getProductBySlug(shopId as string, slug as string),
    enabled: !!shopId && !!slug,
  })
}

export function useShopProducts(shopId: string | undefined) {
  return useQuery({
    queryKey: ['products', 'admin', shopId],
    queryFn: () => listShopProducts(shopId as string),
    enabled: !!shopId,
  })
}
