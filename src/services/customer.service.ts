import { supabase } from '@/lib/supabaseClient'
import { CUSTOMERS_PAGE_SIZE } from '@/config/constants'
import type { Database } from '@/types/database.types'

export type Customer = Database['public']['Tables']['customers']['Row']

/** CRM segments — all computed from the trigger-maintained aggregates, so
 *  these are plain filters/sorts, no extra queries. */
export type CustomerSegment = 'all' | 'new' | 'inactive' | 'top'

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  all: 'Tous',
  new: 'Nouveaux (30 j)',
  inactive: 'Inactifs (60 j)',
  top: 'Top dépense',
}

export interface CustomerListResult {
  customers: Customer[]
  total: number
}

function thirtyDaysAgoIso() {
  return new Date(Date.now() - 30 * 24 * 3600_000).toISOString()
}

function sixtyDaysAgoIso() {
  return new Date(Date.now() - 60 * 24 * 3600_000).toISOString()
}

export async function listCustomers(
  shopId: string,
  page: number,
  segment: CustomerSegment = 'all',
  search?: string,
): Promise<CustomerListResult> {
  const from = (page - 1) * CUSTOMERS_PAGE_SIZE
  const to = from + CUSTOMERS_PAGE_SIZE - 1

  let query = supabase.from('customers').select('*', { count: 'exact' }).eq('shop_id', shopId)

  if (search?.trim()) {
    const term = `%${search.trim().replace(/[%,]/g, '')}%`
    query = query.or(`name.ilike.${term},phone.ilike.${term}`)
  }

  switch (segment) {
    case 'new':
      query = query.gte('first_order_at', thirtyDaysAgoIso()).order('first_order_at', { ascending: false })
      break
    case 'inactive':
      query = query.lt('last_order_at', sixtyDaysAgoIso()).order('last_order_at', { ascending: true })
      break
    case 'top':
      query = query.order('total_spent', { ascending: false })
      break
    default:
      query = query.order('last_order_at', { ascending: false })
      break
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { customers: data ?? [], total: count ?? 0 }
}

/** Correct a customer's name/address (aggregates stay trigger-owned). */
export async function updateCustomer(
  id: string,
  updates: { name?: string; address?: string | null },
): Promise<Customer> {
  const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Pre-filled WhatsApp relance link — no WhatsApp API, zero cost. */
export function customerWhatsappHref(phone: string, name: string, shopName: string): string {
  const firstName = name.split(' ')[0] || 'vous'
  const text = `Bonjour ${firstName} ! C'est ${shopName} — ça fait un moment, nos nouveautés pourraient vous plaire. Dites-nous ce que vous cherchez !`
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
