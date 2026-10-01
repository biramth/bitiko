import type { FeedNote, FeedSource, NoteColor, NoteInput } from '@/services/notes.service'
import { frenchDate } from '@/features/finance/exportCsv'
import { formatCurrency } from '@/utils/format'

export const NOTE_COLORS: { code: NoteColor; label: string; card: string; swatch: string }[] = [
  { code: 'default', label: 'Blanc', card: 'bg-white ring-gray-200', swatch: 'bg-white ring-gray-300' },
  { code: 'yellow', label: 'Jaune', card: 'bg-amber-50 ring-amber-200', swatch: 'bg-amber-200 ring-amber-300' },
  { code: 'green', label: 'Vert', card: 'bg-emerald-50 ring-emerald-200', swatch: 'bg-emerald-200 ring-emerald-300' },
  { code: 'blue', label: 'Bleu', card: 'bg-sky-50 ring-sky-200', swatch: 'bg-sky-200 ring-sky-300' },
  { code: 'pink', label: 'Rose', card: 'bg-rose-50 ring-rose-200', swatch: 'bg-rose-200 ring-rose-300' },
]

export function noteCardClass(color: NoteColor): string {
  return NOTE_COLORS.find((c) => c.code === color)?.card ?? NOTE_COLORS[0].card
}

export function isNoteEmpty(input: Pick<NoteInput, 'title' | 'body'>): boolean {
  return !(input.title ?? '').trim() && !input.body.trim()
}

/** Une note correspond à la recherche si chaque mot apparaît dans son titre ou son texte (sans tenir compte des accents). */
export function matchesSearch(note: { title: string | null; body: string }, query: string): boolean {
  const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const haystack = fold(`${note.title ?? ''} ${note.body}`)
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}

export type FeedGroup = 'bloc' | 'orders' | 'finance' | 'tontines' | 'bookings'

export const FEED_GROUPS: { code: FeedGroup; label: string }[] = [
  { code: 'bloc', label: 'Bloc-notes' },
  { code: 'orders', label: 'Commandes' },
  { code: 'finance', label: 'Finances' },
  { code: 'tontines', label: 'Tontines' },
  { code: 'bookings', label: 'Rendez-vous' },
]

const GROUP_BY_SOURCE: Record<FeedSource, FeedGroup> = {
  order: 'orders',
  finance: 'finance',
  tontine: 'tontines',
  tontine_member: 'tontines',
  tontine_settlement: 'tontines',
  tontine_contribution: 'tontines',
  tontine_cancel: 'tontines',
  appointment: 'bookings',
  reservation: 'bookings',
}

export function feedGroup(source: FeedSource): FeedGroup {
  return GROUP_BY_SOURCE[source]
}

/** Fiche d'origine, où la note se modifie. */
export function feedLink(note: FeedNote): string {
  switch (note.source) {
    case 'order':
      return `/admin/commandes/${note.target_id}`
    case 'finance':
      return '/admin/gestion?tab=journal'
    case 'tontine':
      return `/admin/tontines/${note.target_id}`
    case 'tontine_member':
    case 'tontine_settlement':
    case 'tontine_contribution':
    case 'tontine_cancel':
      return `/admin/tontines/${note.target_id}?membre=${note.sub_id}`
    case 'appointment':
      return '/admin/rendez-vous'
    case 'reservation':
      return '/admin/reservations'
  }
}

/** « D'où vient la note » : la fiche (ex. « Commande CMD-1042 · Fatou ») puis le détail (date, montant). */
export function feedContext(note: FeedNote, currency: string): { origin: string; detail: string | null } {
  const money = (n: number | null) => (n === null ? '' : formatCurrency(n, currency))
  const date = note.on_date ? frenchDate(note.on_date) : ''
  const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ') || null
  const member = `Tontine ${note.title}${note.person ? ` › ${note.person}` : ''}`
  switch (note.source) {
    case 'order':
      return { origin: join(`Commande ${note.title}`, note.person) ?? '', detail: join(date, money(note.amount)) }
    case 'finance':
      return { origin: `Finances · ${note.title}`, detail: join(date, money(note.amount)) }
    case 'tontine':
      return { origin: `Tontine ${note.title}`, detail: null }
    case 'tontine_member':
      return { origin: member, detail: 'Fiche du membre' }
    case 'tontine_settlement':
      return { origin: member, detail: join('Remise', date, money(note.amount)) }
    case 'tontine_contribution':
      return { origin: member, detail: join('Versement', date, money(note.amount)) }
    case 'tontine_cancel':
      return { origin: member, detail: join('Versement annulé', date, money(note.amount)) }
    case 'appointment':
      return { origin: join(`Rendez-vous ${note.title}`, note.person) ?? '', detail: date || null }
    case 'reservation':
      return { origin: join(`Réservation ${note.title}`, note.person) ?? '', detail: date || null }
  }
}
