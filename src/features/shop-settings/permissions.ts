import type { ShopRole } from '@/services/team.service'

/** Zones de l'admin dont l'accès dépend du rôle. La base (RLS) reste la vraie barrière ; ceci évite
 *  d'afficher des écrans qui échoueraient et de laisser un lien direct ouvrir une page interdite. */
export type Area =
  | 'finance'
  | 'customize'
  | 'settings'
  | 'billing'
  | 'team_settings'
  | 'notifications'
  | 'catalog_write'

const DENIED: Record<ShopRole, Area[]> = {
  owner: [],
  manager: ['billing', 'team_settings', 'notifications'],
  // Le vendeur suit les commandes, les clients et l'agenda ; il ne touche ni aux chiffres, ni au catalogue, ni aux réglages.
  vendeur: ['finance', 'customize', 'settings', 'billing', 'team_settings', 'notifications', 'catalog_write'],
}

/** Rôle inconnu (chargement) : autorisé, pour ne pas faire clignoter l'interface du propriétaire. */
export function canAccess(role: ShopRole | null | undefined, area: Area): boolean {
  if (!role) return true
  return !DENIED[role].includes(area)
}
