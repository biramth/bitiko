import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type BookingSettingsRow = Database['public']['Tables']['booking_settings']['Row']
export type BookingSettingsInput = Omit<BookingSettingsRow, 'shop_id' | 'updated_at'>

/** Réglages appliqués tant que la boutique n'a rien configuré (miroir des
 *  valeurs par défaut de la migration 0122 : effective_booking_settings). */
export const DEFAULT_BOOKING_SETTINGS: BookingSettingsInput = {
  timezone: 'Africa/Dakar',
  country_code: 'SN',
  open_time: '09:00',
  close_time: '19:00',
  open_days: [1, 2, 3, 4, 5, 6],
  slot_minutes: 30,
  max_days_ahead: 60,
  table_capacity: 40,
  reservation_minutes: 90,
}

export async function getBookingSettings(shopId: string): Promise<BookingSettingsRow | null> {
  const { data, error } = await supabase.from('booking_settings').select('*').eq('shop_id', shopId).maybeSingle()
  if (error) throw error
  return data
}

export async function saveBookingSettings(shopId: string, input: BookingSettingsInput): Promise<void> {
  const { error } = await supabase.from('booking_settings').upsert({ shop_id: shopId, ...input })
  if (error) throw error
}

/** Messages lisibles pour les erreurs levées par les RPC de réservation. */
export function bookingErrorMessage(error: unknown): string {
  const message =
    typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : ''
  if (message.includes('plan_limit_exceeded')) {
    return 'Ce commerce ne prend plus de demandes en ligne pour le moment. Contactez-le directement.'
  }
  if (message.includes('no longer available') || message.includes('no table available')) {
    return 'Ce créneau vient d’être pris. Choisissez-en un autre.'
  }
  if (message.includes('outside opening hours')) return 'Ce créneau est en dehors des horaires d’ouverture.'
  if (message.includes('too many upcoming bookings')) return 'Vous avez déjà plusieurs réservations à venir avec ce numéro.'
  if (message.includes('too many booking requests')) return 'Trop de demandes en ce moment, réessayez dans un instant.'
  if (message.includes('invalid phone')) return 'Numéro de téléphone invalide.'
  if (message.includes('must be in the future') || message.includes('too far')) return 'Choisissez une date et une heure valides.'
  return message || 'Réservation impossible pour le moment.'
}
