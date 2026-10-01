import { canAccess, type Area } from '@/features/shop-settings/permissions'
import type { ShopRole } from '@/services/team.service'
import type { GuidedTour, TourStep } from './types'

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

/** « Que voulez-vous faire ? » : les actions que les marchands cherchent le plus. */
export const HELP_SHORTCUTS: HelpShortcut[] = [
  { key: 'share', label: 'Copier le lien de mon site', action: 'copy-link' },
  { key: 'order', label: 'Saisir une commande reçue par téléphone', to: '/admin/commandes/nouvelle', capability: 'HAS_ORDERS' },
  { key: 'hours', label: 'Régler mes horaires de réservation', to: '/admin/rendez-vous', capability: 'HAS_APPOINTMENTS' },
  { key: 'expense', label: 'Noter une dépense', to: '/admin/gestion?tab=journal', area: 'finance' },
  { key: 'note', label: 'Écrire une note', to: '/admin/notes', area: 'notes' },
  { key: 'logo', label: 'Ajouter mon logo', to: '/admin/parametres/boutique', area: 'settings' },
  { key: 'whatsapp', label: 'Modifier mon numéro WhatsApp', to: '/admin/parametres/boutique', area: 'settings' },
  { key: 'delivery', label: 'Régler la livraison', to: '/admin/parametres/boutique', capability: 'HAS_DELIVERY', area: 'settings' },
  { key: 'plan', label: 'Changer de formule', to: '/admin/parametres/compte?billing=1', area: 'billing' },
]

export interface HelpAnswer {
  key: string
  question: string
  answer: string
  /** Pages où la réponse est mise en avant (« Sur cette page »). */
  pages: string[]
  link?: { label: string; to: string }
  capability?: string
  area?: Area
}

/** Questions fréquentes : courtes, concrètes, chacune avec un lien vers l'endroit où agir. */
export const HELP_ANSWERS: HelpAnswer[] = [
  {
    key: 'share',
    question: 'Comment faire connaître mon site ?',
    answer: 'Copiez le lien de votre site (raccourci ci-dessous) et partagez-le dans votre statut WhatsApp, vos groupes et vos réseaux. Ajoutez une bannière : elle s’affiche en aperçu quand le lien est partagé.',
    pages: ['/admin'],
    link: { label: 'Ajouter une bannière', to: '/admin/parametres/boutique' },
    area: 'settings',
  },
  {
    key: 'phone-order',
    question: 'Un client a commandé par téléphone : comment l’enregistrer ?',
    answer: 'Utilisez « Nouvelle commande » : la vente rejoint vos autres commandes, votre fichier clients et votre bilan.',
    pages: ['/admin/commandes'],
    link: { label: 'Saisir une commande', to: '/admin/commandes/nouvelle' },
    capability: 'HAS_ORDERS',
  },
  {
    key: 'order-status',
    question: 'Comment prévenir un client que sa commande avance ?',
    answer: 'Ouvrez la commande et faites-la avancer (confirmée, payée, livrée) : le bouton WhatsApp propose un message pré-rempli selon l’étape.',
    pages: ['/admin/commandes'],
    link: { label: 'Voir mes commandes', to: '/admin/commandes' },
    capability: 'HAS_ORDERS',
  },
  {
    key: 'import',
    question: 'J’ai beaucoup de produits : puis-je les ajouter d’un coup ?',
    answer: 'Oui : « Importer (CSV) » sur la page Produits ajoute toute une liste depuis un tableur (Excel, Google Sheets).',
    pages: ['/admin/produits'],
    link: { label: 'Aller aux produits', to: '/admin/produits' },
    capability: 'HAS_PRODUCTS',
    area: 'catalog_write',
  },
  {
    key: 'pending-appointment',
    question: 'Une demande de rendez-vous attend : que faire ?',
    answer: 'Confirmez-la pour bloquer le créneau, ou refusez-la pour le libérer, puis prévenez le client avec le bouton WhatsApp du rendez-vous.',
    pages: ['/admin/rendez-vous'],
    link: { label: 'Voir mon agenda', to: '/admin/rendez-vous' },
    capability: 'HAS_APPOINTMENTS',
  },
  {
    key: 'no-booking',
    question: 'Mes clients ne peuvent pas réserver : pourquoi ?',
    answer: 'Il faut au moins une prestation active (nom, prix, durée). Vérifiez ensuite vos horaires et vos jours de fermeture : seuls ces créneaux sont proposés.',
    pages: ['/admin/rendez-vous', '/admin/prestations'],
    link: { label: 'Mes prestations', to: '/admin/prestations' },
    capability: 'HAS_SERVICES',
  },
  {
    key: 'profit',
    question: 'Comment mon bénéfice est-il calculé ?',
    answer: 'Recettes = commandes payées ou livrées + rendez-vous terminés + recettes notées dans le journal. Dépenses = celles de votre journal. C’est un bilan de gestion, pas une comptabilité légale.',
    pages: ['/admin/gestion'],
    link: { label: 'Ouvrir le journal', to: '/admin/gestion?tab=journal' },
    area: 'finance',
  },
  {
    key: 'accountant',
    question: 'Comment donner mes chiffres à mon comptable ?',
    answer: 'Dans Finances, onglet Bilan : téléchargez le tableur (Excel) ou le bilan PDF imprimable de la période choisie.',
    pages: ['/admin/gestion'],
    link: { label: 'Mon bilan', to: '/admin/gestion' },
    area: 'finance',
  },
  {
    key: 'tontine-income',
    question: 'L’argent des tontines compte-t-il dans mes recettes ?',
    answer: 'Non : l’épargne appartient à vos clients jusqu’à la remise. Seule une remise en marchandise peut être comptée en recette, si vous le choisissez au moment de la remise.',
    pages: ['/admin/tontines'],
    link: { label: 'Mes tontines', to: '/admin/tontines' },
    area: 'finance',
  },
  {
    key: 'tontine-mistake',
    question: 'J’ai saisi un versement de tontine par erreur',
    answer: 'Ouvrez la fiche du membre et annulez le versement en indiquant le motif. Il n’est jamais effacé : la trace reste en cas de désaccord.',
    pages: ['/admin/tontines'],
    area: 'finance',
  },
  {
    key: 'all-notes',
    question: 'Où retrouver les notes laissées sur mes commandes ?',
    answer: 'Dans Notes, onglet « Toutes les notes » : commandes, dépenses, tontines et bloc-notes au même endroit, avec un lien vers chaque fiche.',
    pages: ['/admin/notes'],
    link: { label: 'Toutes les notes', to: '/admin/notes?vue=toutes' },
    area: 'notes',
  },
  {
    key: 'team',
    question: 'Comment faire travailler quelqu’un avec moi ?',
    answer: 'Invitez un manager ou un vendeur depuis Paramètres › Équipe (formule Pro). Le vendeur suit les commandes et l’agenda, sans accès aux chiffres ni aux réglages.',
    pages: [],
    link: { label: 'Mon équipe', to: '/admin/parametres/equipe' },
    area: 'team_settings',
  },
  {
    key: 'publish',
    question: 'J’ai modifié mon site mais rien ne change en ligne',
    answer: 'Dans Personnaliser, cliquez sur « Publier » : vos retouches sont enregistrées au fil de l’eau mais ne sont visibles qu’après publication.',
    pages: ['/admin/personnaliser'],
    link: { label: 'Personnaliser', to: '/admin/personnaliser' },
    capability: 'HAS_SHOP',
    area: 'customize',
  },
]

/** « /admin » (accueil) ne doit pas compter comme la page courante de toutes les pages de l'admin. */
export const isOnPage = (pathname: string, page: string) =>
  pathname === page || (page !== '/admin' && pathname.startsWith(`${page}/`))

const hasCapability = (caps: ReadonlySet<string> | null, capability?: string) =>
  !capability || caps === null || caps.has(capability)

const allowed = (caps: ReadonlySet<string> | null, role: ShopRole | null | undefined, item: { capability?: string; area?: Area }) =>
  hasCapability(caps, item.capability) && (!item.area || canAccess(role, item.area))

/** Recherche tolérante : chaque mot doit apparaître, sans tenir compte des accents ni de la casse. */
export function matchesQuery(text: string, query: string): boolean {
  const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const haystack = fold(text)
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}

/** Étapes d'une visite pour ce métier et ce rôle (on ne pointe pas un menu que la personne ne voit pas). */
export function stepsFor(tour: GuidedTour, caps: ReadonlySet<string> | null, role: ShopRole | null | undefined): TourStep[] {
  return tour.steps.filter((step) => allowed(caps, role, step))
}

export function visibleShortcuts(caps: ReadonlySet<string> | null, role: ShopRole | null | undefined, query = ''): HelpShortcut[] {
  return HELP_SHORTCUTS.filter((s) => allowed(caps, role, s) && matchesQuery(s.label, query))
}

/** Visites proposées au métier, celles de la page courante en premier. */
export function toursForHelp(
  tours: readonly GuidedTour[],
  caps: ReadonlySet<string> | null,
  pathname: string,
  role?: ShopRole | null,
  query = '',
): { tour: GuidedTour; onPage: boolean }[] {
  const entries = tours
    .filter((tour) => allowed(caps, role, tour) && matchesQuery([tour.title, tour.description, ...tour.steps.map((s) => s.title)].join(' '), query))
    .map((tour) => ({ tour, onPage: tour.pages.some((page) => isOnPage(pathname, page)) }))
  return [...entries.filter((e) => e.onPage), ...entries.filter((e) => !e.onPage)]
}

/** Questions fréquentes : celles de la page courante d'abord. Sans recherche, seules celles de la page
 *  (ou les plus générales à défaut) sont proposées, pour garder le panneau court. */
export function answersForHelp(
  caps: ReadonlySet<string> | null,
  pathname: string,
  role: ShopRole | null | undefined,
  query = '',
): { answer: HelpAnswer; onPage: boolean }[] {
  const entries = HELP_ANSWERS.filter((a) => allowed(caps, role, a)).map((answer) => ({
    answer,
    onPage: answer.pages.some((page) => isOnPage(pathname, page)),
  }))
  if (query.trim()) {
    const found = entries.filter((e) => matchesQuery(`${e.answer.question} ${e.answer.answer}`, query))
    return [...found.filter((e) => e.onPage), ...found.filter((e) => !e.onPage)]
  }
  const here = entries.filter((e) => e.onPage)
  return here.length > 0 ? here : entries.filter((e) => e.answer.pages.includes('/admin') || e.answer.pages.length === 0)
}

/** Lien WhatsApp vers l'équipe Bitiko, ou null tant que le numéro n'est pas configuré. */
export function supportLink(rawNumber: string | undefined, shopName?: string): string | null {
  const digits = (rawNumber ?? '').replace(/\D/g, '')
  if (digits.length < 8) return null
  const text = `Bonjour Bitiko, j’ai besoin d’aide${shopName ? ` pour ma boutique « ${shopName} »` : ''}.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
