import { supabase } from '@/lib/supabaseClient'
import type { ProductVariant } from '@/types'

export type VariantInput = Pick<
  ProductVariant,
  'product_id' | 'name' | 'sku' | 'price' | 'stock' | 'active' | 'sort_order'
>

export async function listVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as ProductVariant[]
}

export async function createVariant(input: VariantInput): Promise<ProductVariant> {
  const { data, error } = await supabase.from('product_variants').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateVariant(
  id: string,
  updates: Partial<VariantInput>,
): Promise<ProductVariant> {
  const { data, error } = await supabase
    .from('product_variants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVariant(id: string): Promise<void> {
  const { error } = await supabase.from('product_variants').delete().eq('id', id)
  if (error) throw error
}

/** Re-applies sort_order from the given ordered list (drag-and-drop reorder). */
export async function reorderVariants(ordered: { id: string; sort_order: number }[]): Promise<void> {
  const updates = ordered.map(({ id, sort_order }) =>
    supabase.from('product_variants').update({ sort_order }).eq('id', id),
  )
  const results = await Promise.all(updates)
  const error = results.find((r) => r.error)?.error
  if (error) throw error
}