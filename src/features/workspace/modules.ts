import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Wand2,
  type LucideIcon,
} from 'lucide-react'

/** A workspace module: one nav entry + route, gated by business capabilities
 *  (HAS_*, from the activity's business type) and plan entitlements.
 *  This registry is the PHASE-06 contract — the sidebar and dashboard derive
 *  from it, so a new métier never means editing navigation code by hand:
 *  it means capabilities on the business type (PHASE-05) + a module entry here
 *  when its route exists. Server-side enforcement of entitlements arrives in
 *  PHASE-10; here the registry drives visibility only. */
export interface WorkspaceModule {
  key: string
  label: string
  to: string
  icon: LucideIcon
  group?: string
  end?: boolean
  guide?: string
  /** Shows the pending+confirmed orders count as a pill (Commandes only). */
  ordersBadge?: boolean
  /** ALL listed capabilities required (empty = always visible). */
  capabilities?: string[]
  /** Plan gates (see Plan in src/config/plans.ts). Empty = no plan gate. */
  entitlements?: ('teamAccess')[]
  /** Kill-switch per module without touching code paths. */
  enabled: boolean
}

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  { key: 'dashboard', label: 'Tableau de bord', to: '/admin', icon: LayoutDashboard, end: true, guide: 'guide-nav-dashboard', enabled: true },
  { key: 'orders', label: 'Commandes', to: '/admin/commandes', icon: ShoppingBag, group: 'Ventes', guide: 'guide-nav-commandes', ordersBadge: true, capabilities: ['HAS_ORDERS'], enabled: true },
  { key: 'customers', label: 'Clients', to: '/admin/clients', icon: Users, group: 'Ventes', capabilities: ['HAS_CUSTOMERS'], enabled: true },
  { key: 'products', label: 'Produits', to: '/admin/produits', icon: Package, group: 'Boutique', guide: 'guide-nav-produits', capabilities: ['HAS_PRODUCTS'], enabled: true },
  { key: 'customize', label: 'Personnaliser', to: '/admin/personnaliser', icon: Wand2, group: 'Boutique', guide: 'guide-nav-personnaliser', capabilities: ['HAS_SHOP'], enabled: true },
]

export interface ModuleContext {
  teamAccess: boolean
}

/** Pure resolver — unit-tested. `caps = null` means "capabilities unknown"
 *  (RPC failure, legacy shop): fail OPEN to today's navigation so no existing
 *  merchant ever loses their workspace. A known-but-empty set hides everything
 *  capability-gated (dashboard stays: the workspace shell itself). */
export function resolveModules(
  modules: WorkspaceModule[],
  caps: Set<string> | null,
  ctx: ModuleContext,
): WorkspaceModule[] {
  return modules.filter((m) => {
    if (!m.enabled) return false
    if (m.capabilities && m.capabilities.length > 0) {
      if (caps === null) return true
      if (!m.capabilities.every((c) => caps.has(c))) return false
    }
    if (m.entitlements?.includes('teamAccess') && !ctx.teamAccess) return false
    return true
  })
}

/** Groups resolved modules for the sidebar (ungrouped first, then Ventes, Boutique…). */
export function groupModules(modules: WorkspaceModule[]): { label?: string; items: WorkspaceModule[] }[] {
  const order = new Map<string, number>()
  const groups = new Map<string | undefined, WorkspaceModule[]>()
  for (const m of modules) {
    if (!groups.has(m.group)) {
      groups.set(m.group, [])
      order.set(m.group ?? '', order.size)
    }
    groups.get(m.group)?.push(m)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (order.get(a ?? '') ?? 0) - (order.get(b ?? '') ?? 0))
    .map(([label, items]) => ({ label, items }))
}
