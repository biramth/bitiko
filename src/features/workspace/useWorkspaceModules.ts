import { useQuery } from '@tanstack/react-query'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { fetchShopBusinessTypeSlug, fetchBusinessCapabilities } from '@/services/businessType.service'
import { WORKSPACE_MODULES, groupModules, renameGroupsForProfile, resolveModules, sortGroupsForProfile } from './modules'

/** Workspace navigation derived from `Business Type → Capabilities → Modules`
 *  (+ plan entitlements). For today's commerce shops the output is identical to
 *  the historic sidebar; a future type without HAS_ORDERS simply won't see
 *  Commandes — no `if businessType ===` anywhere in the UI. */
export function useWorkspaceModules() {
  const { data: shop } = useMyShop()
  const { plan } = useShopPlan(shop?.id)

  const { data: caps } = useQuery({
    queryKey: ['workspace-capabilities', shop?.id],
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

  const modules = resolveModules(WORKSPACE_MODULES, caps ?? null, {
    teamAccess: plan.teamAccess,
  })

  // Sans commerce, le groupe « Boutique » (qui ne contient plus que
  // Personnaliser) devient « Site » : un salon personnalise son site, pas une
  // boutique. Capabilities inconnues = libellés historiques.
  const groups = sortGroupsForProfile(
    renameGroupsForProfile(groupModules(modules), caps ?? null),
    caps ?? null,
  )

  return { modules, groups, capabilities: caps ?? null, isReady: !!shop?.id }
}
