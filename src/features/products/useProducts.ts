import { useQuery } from '@tanstack/react-query'
import {
  getActiveProductsByIds,
  getProductBySlug,
  listActiveProducts,
  listShopProducts,
  type AdminProductFilters,
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

export function useFeaturedProducts(shopId: string | undefined, productIds: string[]) {
  return useQuery({
    queryKey: ['products', 'featured', shopId, productIds],
    queryFn: () => getActiveProductsByIds(shopId as string, productIds),
    enabled: !!shopId && productIds.length > 0,
  })
}

export function useShopProducts(
  shopId: string | undefined,
  filters: AdminProductFilters = {},
  lowStockThreshold?: number,
) {
  return useQuery({
    queryKey: ['products', 'admin', shopId, filters, lowStockThreshold],
    queryFn: () => listShopProducts(shopId as string, filters, lowStockThreshold ?? 5),
    enabled: !!shopId,
  })
}
