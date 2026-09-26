import { useQuery } from '@tanstack/react-query'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { fetchShopCapabilities } from '@/services/businessType.service'
import { WORKSPACE_MODULES, groupModules, resolveModules, sortGroupsForProfile } from './modules'

/** Workspace navigation derived from `Business Type → Capabilities → Modules`
 *  (+ plan entitlements). For today's commerce shops the output is identical to
 *  the historic sidebar; a future type without HAS_ORDERS simply won't see
 *  Commandes — no `if businessType ===` anywhere in the UI. */
export function useWorkspaceModules() {
  const { data: shop } = useMyShop()
  const { plan } = useShopPlan(shop?.id)

  const { data: caps } = useQuery({
    queryKey: ['workspace-capabilities', shop?.id],
    queryFn: (): Promise<Set<string> | null> => (shop?.id ? fetchShopCapabilities(shop.id) : Promise.resolve(null)),
    enabled: !!shop?.id,
    staleTime: 5 * 60 * 1000,
  })

  // Chargement : les modules conditionnés par une capability restent masqués
  // (ensemble vide) au lieu de s'afficher puis de disparaître. `null` (échec
  // ou type inconnu) reste le seul cas « fail open ».
  const capsLoading = !!shop?.id && caps === undefined
  const resolvedCaps = capsLoading ? new Set<string>() : (caps ?? null)

  const modules = resolveModules(WORKSPACE_MODULES, resolvedCaps, {
    teamAccess: plan.teamAccess,
  })

  // Personnaliser est hors groupe (niveau tableau de bord) : il concerne
  // tout le site client. L'ordre des groupes suit le profil métier.
  const groups = sortGroupsForProfile(groupModules(modules), resolvedCaps)

  return { modules, groups, capabilities: caps ?? null, capabilitiesLoading: capsLoading, isReady: !!shop?.id }
}
