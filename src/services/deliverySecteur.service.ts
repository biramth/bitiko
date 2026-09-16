import { supabase } from '@/lib/supabaseClient'
import type { DeliverySecteur, DeliveryVille } from '@/types'

// ---------------------------------------------------------------------------
// Secteurs
// ---------------------------------------------------------------------------

export async function listDeliverySecteurs(shopId: string): Promise<DeliverySecteur[]> {
  const { data, error } = await supabase
    .from('delivery_secteurs')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createDeliverySecteur(input: {
  shopId: string
  name: string
  fee: number
}): Promise<DeliverySecteur> {
  const { data, error } = await supabase
    .from('delivery_secteurs')
    .insert({ shop_id: input.shopId, name: input.name.trim(), fee: input.fee })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDeliverySecteur(
  id: string,
  updates: Partial<Pick<DeliverySecteur, 'name' | 'fee' | 'is_active'>>,
): Promise<DeliverySecteur> {
  const payload: Partial<DeliverySecteur> = { ...updates }
  if (updates.name !== undefined) payload.name = updates.name.trim()
  const { data, error } = await supabase
    .from('delivery_secteurs')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDeliverySecteur(id: string): Promise<void> {
  const { error } = await supabase.from('delivery_secteurs').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Villes
// ---------------------------------------------------------------------------

export async function listDeliveryVilles(shopId: string): Promise<DeliveryVille[]> {
  const { data, error } = await supabase
    .from('delivery_villes')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createDeliveryVille(input: {
  shopId: string
  secteurId: string
  name: string
}): Promise<DeliveryVille> {
  const { data, error } = await supabase
    .from('delivery_villes')
    .insert({ shop_id: input.shopId, secteur_id: input.secteurId, name: input.name.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDeliveryVille(
  id: string,
  updates: Partial<Pick<DeliveryVille, 'name' | 'is_active' | 'secteur_id'>>,
): Promise<DeliveryVille> {
  const payload: Partial<DeliveryVille> = { ...updates }
  if (updates.name !== undefined) payload.name = updates.name.trim()
  const { data, error } = await supabase
    .from('delivery_villes')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDeliveryVille(id: string): Promise<void> {
  const { error } = await supabase.from('delivery_villes').delete().eq('id', id)
  if (error) throw error
}
