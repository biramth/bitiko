import type { BadgeTone } from '@/components/ui/Badge'

export type BookingStatus = 'pending' | 'confirmed' | 'done' | 'cancelled'

/** Couleur du badge de statut, commune aux rendez-vous et aux réservations. */
export const BOOKING_STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'info',
  done: 'success',
  cancelled: 'neutral',
}

/** Ce que chaque statut veut dire, en une phrase (aide sous la liste). */
export const BOOKING_STATUS_HELP: Record<BookingStatus, string> = {
  pending: 'Demande reçue, à valider par vous.',
  confirmed: 'Vous avez accepté : le créneau est réservé.',
  done: 'Le client est venu, c’est terminé.',
  cancelled: 'Annulé : le créneau est de nouveau libre.',
}

export const BOOKING_STATUS_ORDER: BookingStatus[] = ['pending', 'confirmed', 'done', 'cancelled']
