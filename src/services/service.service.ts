import { supabase } from '@/lib/supabaseClient'
import { SERVICES_PAGE_SIZE } from '@/config/constants'
import type { Database } from '@/types/database.types'

export type ServiceRow = Database['public']['Tables']['services']['Row']

export interface ServiceWithCategory extends ServiceRow {
  category: { id: string; name: string } | null
}

export type ServiceSort = 'manual' | 'price_asc' | 'price_desc' | 'duration_asc' | 'duration_desc'

export interface ServiceFilters {
  shopId: string
  search?: string
  categoryId?: string
  sort?: ServiceSort
  page?: number
  /** Taille de page ; défaut = grille des prestations. */
  pageSize?: number
}

export interface ServiceListResult {
  services: ServiceWithCategory[]
  total: number
}

const SELECT = '*, category:categories(id, name)'

/** Prestations actives d'une boutique (vitrine publique + blocs builder). */
export async function listActiveServices(filters: ServiceFilters): Promise<ServiceListResult> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? SERVICES_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('services')
    .select(SELECT, { count: 'exact' })
    .eq('shop_id', filters.shopId)
    .eq('active', true)

  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  switch (filters.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price', { ascending: false })
      break
    case 'duration_asc':
      query = query.order('duration_minutes', { ascending: true })
      break
    case 'duration_desc':
      query = query.order('duration_minutes', { ascending: false })
      break
    default:
      query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false })
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { services: (data ?? []) as ServiceWithCategory[], total: count ?? 0 }
}

/** Prestations actives par id, dans l'ordre donné (bloc "coups de cœur"). */
export async function getActiveServicesByIds(shopId: string, ids: string[]): Promise<ServiceWithCategory[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('services')
    .select(SELECT)
    .eq('shop_id', shopId)
    .eq('active', true)
    .in('id', ids)
    .order('sort_order', { ascending: true })
  if (error) throw error
  const byId = new Map(((data ?? []) as ServiceWithCategory[]).map((s) => [s.id, s]))
  return ids.map((id) => byId.get(id)).filter((s): s is ServiceWithCategory => !!s)
}

/** Toutes les prestations (backoffice, actives + inactives). */
export async function listShopServices(shopId: string): Promise<ServiceWithCategory[]> {
  const { data, error } = await supabase
    .from('services')
    .select(SELECT)
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ServiceWithCategory[]
}

export type ServiceInput = Pick<
  ServiceRow,
  'shop_id' | 'category_id' | 'name' | 'description' | 'price' | 'duration_minutes' | 'active'
>

export async function createService(input: ServiceInput): Promise<ServiceRow> {
  const { data, error } = await supabase.from('services').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateService(id: string, updates: Partial<ServiceInput>): Promise<ServiceRow> {
  const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}
