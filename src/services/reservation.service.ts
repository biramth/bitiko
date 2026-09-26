import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type ReservationRow = Database['public']['Tables']['reservations']['Row']
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'done'

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  done: 'Terminée',
}

export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  done: 'bg-emerald-100 text-emerald-800',
}

/** Réservations d'une boutique sur une journée (backoffice). */
export async function listReservationsByDate(shopId: string, date: string): Promise<ReservationRow[]> {
  const start = new Date(`${date}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('shop_id', shopId)
    .gte('start_at', start.toISOString())
    .lt('start_at', end.toISOString())
    .order('start_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Prochaines réservations (dashboard, non annulées). */
export async function listUpcomingReservations(shopId: string, limit = 8): Promise<ReservationRow[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('shop_id', shopId)
    .neq('status', 'cancelled')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

/** Réservation de table (invité ou backoffice). */
export async function createReservation(input: {
  shopId: string
  customerName: string
  customerPhone: string
  partySize: number
  startAt: string
}): Promise<ReservationRow> {
  const { data, error } = await supabase.rpc('create_reservation', {
    p_shop_id: input.shopId,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_party_size: input.partySize,
    p_start_at: input.startAt,
  })
  if (error) throw error
  return data as ReservationRow
}

export async function setReservationStatus(id: string, status: ReservationStatus): Promise<ReservationRow> {
  const { data, error } = await supabase.rpc('set_reservation_status', {
    p_reservation_id: id,
    p_status: status,
  })
  if (error) throw error
  return data as ReservationRow
}

/** Débuts de créneaux de table libres (ISO) pour un nombre de couverts. */
export async function getReservationSlots(input: {
  shopId: string
  partySize: number
  date: string
}): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_reservation_slots', {
    p_shop_id: input.shopId,
    p_party_size: input.partySize,
    p_date: input.date,
  })
  if (error) throw error
  return (data ?? []).map((row) => row.slot_start)
}
