import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyShops } from '@/services/shop.service'
import { useAuth } from '@/features/auth/AuthContext'
import type { Shop } from '@/types'

const SELECTED_SHOP_KEY = 'bitiko:admin-shop-id'

/** The merchant's current shop id, persisted per browser. Null = never
 *  chosen (falls back to the oldest shop). Survives reloads; cleared on
 *  sign-out by the auth layer alongside its other local keys. */
export function getSelectedShopId(): string | null {
  try {
    return localStorage.getItem(SELECTED_SHOP_KEY)
  } catch {
    return null
  }
}

/** All shops owned by the logged-in merchant, oldest first. The query key
 *  intentionally stays `my-shop` (not `my-shops`): a dozen call sites
 *  invalidate `['my-shop']` after mutations, and React Query matches keys
 *  element-wise — renaming would silently orphan every one of them. */
export function useMyShops() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-shop', user?.id],
    queryFn: () => getMyShops(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })
}

/** The shop the admin workspace is currently scoped to (the merchant's
 *  selection, oldest shop by default). Same return shape as before the
 *  multi-shop rework, so the ~15 consuming pages are untouched. */
export function useMyShop() {
  const shopsQuery = useMyShops()
  const selectedId = getSelectedShopId()
  const shop: Shop | null =
    shopsQuery.data?.find((s) => s.id === selectedId) ?? shopsQuery.data?.[0] ?? null
  return { ...shopsQuery, data: shop }
}

/** Switch workspace scope, then go home — staying on a deep page (a product
 *  id, a builder draft) across shops would show one shop's data under
 *  another's context. Returns a navigate-to path for the caller. */
export function selectShop(shopId: string, queryClient: ReturnType<typeof useQueryClient>) {
  try {
    localStorage.setItem(SELECTED_SHOP_KEY, shopId)
  } catch {
    // Private browsing — selection lasts for this session only.
  }
  void queryClient.invalidateQueries({ queryKey: ['my-shop'] })
}
