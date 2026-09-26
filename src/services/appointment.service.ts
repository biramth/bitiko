import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type AppointmentRow = Database['public']['Tables']['appointments']['Row']
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'done'

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  done: 'Terminé',
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  done: 'bg-emerald-100 text-emerald-800',
}

export interface AppointmentWithRelations extends AppointmentRow {
  service: { id: string; name: string; price: number; duration_minutes: number } | null
  team_member: { id: string; name: string } | null
}

/** Rendez-vous d'une boutique sur une journée (backoffice). */
export async function listAppointmentsByDate(shopId: string, date: string): Promise<AppointmentWithRelations[]> {
  const start = new Date(`${date}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const { data, error } = await supabase
    .from('appointments')
    .select('*, service:services(id, name, price, duration_minutes), team_member:team_members(id, name)')
    .eq('shop_id', shopId)
    .gte('start_at', start.toISOString())
    .lt('start_at', end.toISOString())
    .order('start_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as AppointmentWithRelations[]
}

/** Prochains rendez-vous (dashboard, tous statuts sauf annulés). */
export async function listUpcomingAppointments(shopId: string, limit = 8): Promise<AppointmentWithRelations[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, service:services(id, name, price, duration_minutes), team_member:team_members(id, name)')
    .eq('shop_id', shopId)
    .neq('status', 'cancelled')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AppointmentWithRelations[]
}

/** Prise de rendez-vous (invité ou backoffice). La durée, les horaires et la
 *  disponibilité sont décidés par le serveur (fin = début + durée prestation). */
export async function createAppointment(input: {
  shopId: string
  serviceId: string
  teamMemberId?: string | null
  customerName: string
  customerPhone: string
  startAt: string
}): Promise<AppointmentRow> {
  const { data, error } = await supabase.rpc('create_appointment', {
    p_shop_id: input.shopId,
    p_service_id: input.serviceId,
    p_team_member_id: input.teamMemberId ?? null,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_start_at: input.startAt,
  })
  if (error) throw error
  return data as AppointmentRow
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus): Promise<AppointmentRow> {
  const { data, error } = await supabase.rpc('set_appointment_status', {
    p_appointment_id: id,
    p_status: status,
  })
  if (error) throw error
  return data as AppointmentRow
}

/** Débuts de créneaux libres (ISO) pour une prestation un jour donné. */
export async function getBookingSlots(input: {
  shopId: string
  serviceId: string
  teamMemberId?: string | null
  date: string
}): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_booking_slots', {
    p_shop_id: input.shopId,
    p_service_id: input.serviceId,
    p_team_member_id: input.teamMemberId ?? null,
    p_date: input.date,
  })
  if (error) throw error
  return (data ?? []).map((row) => row.slot_start)
}
