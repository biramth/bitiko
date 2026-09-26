import { useQuery } from '@tanstack/react-query'
import {
  getActiveProductsByIds,
  getProductBySlug,
  listActiveProducts,
  listRelatedProducts,
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

export function useRelatedProducts(
  shopId: string | undefined,
  categoryId: string | null | undefined,
  excludeProductId: string | undefined,
  limit = 4,
) {
  return useQuery({
    queryKey: ['products', 'related', shopId, categoryId, excludeProductId, limit],
    queryFn: () => listRelatedProducts(shopId as string, categoryId, excludeProductId as string, limit),
    enabled: !!shopId && !!excludeProductId,
  })
}

/** Nombre de produits montrés par une section « sélection » dont le commerçant n'a rien choisi. */
export const FEATURED_FALLBACK_COUNT = 4

/** Produits choisis à la main ; sans choix, les plus récents — un gabarit neuf
 *  affiche ainsi sa sélection dès le premier produit ajouté. */
export function useFeaturedProducts(shopId: string | undefined, productIds: string[]) {
  return useQuery({
    queryKey: ['products', 'featured', shopId, productIds],
    queryFn: async () =>
      productIds.length > 0
        ? getActiveProductsByIds(shopId as string, productIds)
        : (await listActiveProducts({ shopId: shopId as string, sort: 'recent', pageSize: FEATURED_FALLBACK_COUNT })).products,
    enabled: !!shopId,
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
