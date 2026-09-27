import { canAccess, type Area } from '@/features/shop-settings/permissions'
import type { ShopRole } from '@/services/team.service'
import type { GuidedTour } from './types'

export interface HelpShortcut {
  key: string
  label: string
  /** Page ouverte ; sans `to`, l'entrée déclenche l'action nommée. */
  to?: string
  action?: 'copy-link'
  /** Capability HAS_* requise (inconnue = conservée). */
  capability?: string
  area?: Area
}

/** « Que veux-tu faire ? » : les réglages que les nouveaux marchands cherchent le plus. */
export const HELP_SHORTCUTS: HelpShortcut[] = [
  { key: 'share', label: 'Copier le lien de ma boutique', action: 'copy-link' },
  { key: 'logo', label: 'Ajouter mon logo', to: '/admin/parametres/boutique', area: 'settings' },
  { key: 'whatsapp', label: 'Modifier mon numéro WhatsApp', to: '/admin/parametres/boutique', area: 'settings' },
  { key: 'delivery', label: 'Régler la livraison', to: '/admin/parametres/boutique', capability: 'HAS_DELIVERY', area: 'settings' },
  { key: 'hours', label: 'Régler mes horaires de réservation', to: '/admin/rendez-vous', capability: 'HAS_APPOINTMENTS' },
  { key: 'plan', label: 'Changer de formule', to: '/admin/parametres/compte?billing=1', area: 'billing' },
]

/** « /admin » (accueil) ne doit pas compter comme la page courante de toutes les pages de l'admin. */
const isOnPage = (pathname: string, page: string) =>
  pathname === page || (page !== '/admin' && pathname.startsWith(`${page}/`))

const hasCapability = (caps: ReadonlySet<string> | null, capability?: string) =>
  !capability || caps === null || caps.has(capability)

export function visibleShortcuts(caps: ReadonlySet<string> | null, role: ShopRole | null | undefined): HelpShortcut[] {
  return HELP_SHORTCUTS.filter((s) => hasCapability(caps, s.capability) && (!s.area || canAccess(role, s.area)))
}

/** Visites proposées au métier, celles de la page courante en premier. */
export function toursForHelp(
  tours: readonly GuidedTour[],
  caps: ReadonlySet<string> | null,
  pathname: string,
  role?: ShopRole | null,
): { tour: GuidedTour; onPage: boolean }[] {
  const entries = tours
    .filter((tour) => hasCapability(caps, tour.capability) && (!tour.area || canAccess(role, tour.area)))
    .map((tour) => ({ tour, onPage: tour.pages.some((page) => isOnPage(pathname, page)) }))
  return [...entries.filter((e) => e.onPage), ...entries.filter((e) => !e.onPage)]
}

/** Lien WhatsApp vers l'équipe Bitiko, ou null tant que le numéro n'est pas configuré. */
export function supportLink(rawNumber: string | undefined, shopName?: string): string | null {
  const digits = (rawNumber ?? '').replace(/\D/g, '')
  if (digits.length < 8) return null
  const text = `Bonjour Bitiko, j’ai besoin d’aide${shopName ? ` pour ma boutique « ${shopName} »` : ''}.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
