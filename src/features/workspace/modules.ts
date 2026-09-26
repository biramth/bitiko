import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Package,
  Scissors,
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
  { key: 'services', label: 'Prestations', to: '/admin/prestations', icon: Scissors, group: 'Services', capabilities: ['HAS_SERVICES'], enabled: true },
  { key: 'appointments', label: 'Rendez-vous', to: '/admin/rendez-vous', icon: CalendarDays, group: 'Services', capabilities: ['HAS_APPOINTMENTS'], enabled: true },
  { key: 'reservations', label: 'Réservations', to: '/admin/reservations', icon: BookOpen, group: 'Services', capabilities: ['HAS_RESERVATIONS'], enabled: true },
  // L'équipe (vitrine) est transversale : son propre groupe, jamais noyée
  // dans « Services » (sinon une boutique mode verrait un groupe Services
  // avec pour seul contenu l'Équipe).
  { key: 'team', label: 'Équipe', to: '/admin/equipe', icon: Users, group: 'Équipe', capabilities: ['HAS_TEAM'], enabled: true },
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

/** Relabels groups for the business profile. Sans commerce, le groupe
 *  « Boutique » (qui ne contient plus que Personnaliser) devient « Site » :
 *  un salon personnalise son site, pas une boutique. Capabilities inconnues
 *  (null) = libellés historiques. Pure — unit-testée. */
export function renameGroupsForProfile(
  groups: { label?: string; items: WorkspaceModule[] }[],
  caps: Set<string> | null,
): { label?: string; items: WorkspaceModule[] }[] {
  if (caps === null || caps.has('HAS_PRODUCTS')) return groups
  return groups.map((group) => (group.label === 'Boutique' ? { ...group, label: 'Site' } : group))
}

/** Orders groups for the business profile. Un métier de service voit
 *  « Services » juste sous le tableau de bord (son cœur d'activité), puis
 *  Ventes, Boutique/Site, Équipe. Commerce pur et capabilities inconnues :
 *  ordre historique inchangé. Tri stable — pure, unit-testée. */
export function sortGroupsForProfile(
  groups: { label?: string; items: WorkspaceModule[] }[],
  caps: Set<string> | null,
): { label?: string; items: WorkspaceModule[] }[] {
  if (caps === null) return groups
  const serviceFirst =
    caps.has('HAS_SERVICES') || caps.has('HAS_APPOINTMENTS') || caps.has('HAS_RESERVATIONS')
  if (!serviceFirst) return groups
  const rank = (label?: string): number => {
    if (label === undefined) return 0
    if (label === 'Services') return 1
    if (label === 'Ventes') return 2
    if (label === 'Boutique' || label === 'Site') return 3
    if (label === 'Équipe') return 4
    return 5
  }
  return [...groups].sort((a, b) => rank(a.label) - rank(b.label))
}
