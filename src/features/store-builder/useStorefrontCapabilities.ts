import { useQuery } from '@tanstack/react-query'
import { fetchBusinessCapabilities, fetchShopBusinessTypeSlug } from '@/services/businessType.service'
import type { Shop } from '@/types'

/** Storefront capability set for adaptation (PHASE-07): which HAS_* codes the
 *  shop's business type carries. Returns `null` when unknown (no shop, no type,
 *  fetch failure) — callers fail OPEN and render everything, so the historic
 *  e-commerce frontstore behaves exactly as before until sections declare
 *  capability requirements. */
export function useStorefrontCapabilities(shop: Shop | null | undefined) {
  const { data } = useQuery({
    queryKey: ['storefront-capabilities', shop?.id],
    queryFn: async (): Promise<Set<string> | null> => {
      if (!shop?.id) return null
      try {
        const slug = await fetchShopBusinessTypeSlug(shop.id)
        if (!slug) return null
        return new Set(await fetchBusinessCapabilities(slug))
      } catch {
        return null
      }
    },
    enabled: !!shop?.id,
    staleTime: 5 * 60 * 1000,
  })
  return data ?? null
}
