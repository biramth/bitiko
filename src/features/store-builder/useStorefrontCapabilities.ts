import { useQuery } from '@tanstack/react-query'
import { fetchShopCapabilities } from '@/services/businessType.service'
import type { Shop } from '@/types'

/** Storefront capability set for adaptation (PHASE-07): which HAS_* codes the
 *  shop's business type carries. Returns `null` when unknown (no shop, no type,
 *  fetch failure) — callers fail OPEN and render everything, so the historic
 *  e-commerce frontstore behaves exactly as before until sections declare
 *  capability requirements. */
export function useStorefrontCapabilitiesState(shop: Shop | null | undefined) {
  const { data, isPending } = useQuery({
    queryKey: ['storefront-capabilities', shop?.id],
    queryFn: (): Promise<Set<string> | null> => (shop?.id ? fetchShopCapabilities(shop.id) : Promise.resolve(null)),
    enabled: !!shop?.id,
    staleTime: 5 * 60 * 1000,
  })
  return { capabilities: data ?? null, isLoading: !!shop?.id && isPending }
}

export function useStorefrontCapabilities(shop: Shop | null | undefined) {
  return useStorefrontCapabilitiesState(shop).capabilities
}
