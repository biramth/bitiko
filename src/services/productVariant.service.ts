import { supabase } from '@/lib/supabaseClient'
import { compressImageFile } from '@/utils/image'
import type { ProductVariant } from '@/types'

export type VariantInput = Pick<
  ProductVariant,
  'product_id' | 'name' | 'sku' | 'price' | 'stock' | 'active' | 'sort_order'
> & {
  image_url?: string | null
}

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

const VARIANT_IMAGE_BUCKET = 'product-images'

/** Uploads a variant's photo and stores its public URL on the variant row.
 *  Free plan: a variant photo consumes one of the product's 4 photo slots
 *  (enforced server-side by the 0046 trigger as well). */
export async function uploadVariantImage(
  productId: string,
  variantId: string,
  file: File,
): Promise<ProductVariant> {
  const optimized = await compressImageFile(file)
  const ext = optimized.name.split('.').pop()
  const path = `${productId}/variants/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(VARIANT_IMAGE_BUCKET)
    .upload(path, optimized, { cacheControl: '3600', upsert: false })
  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabase.storage
    .from(VARIANT_IMAGE_BUCKET)
    .getPublicUrl(path)

  return updateVariant(variantId, { image_url: publicUrlData.publicUrl })
}

/** Clears a variant's photo (the storage object is left in place — the copy
 *  in Storage is cheap; removing it would require tracking the storage path). */
export async function clearVariantImage(variantId: string): Promise<void> {
  await updateVariant(variantId, { image_url: null })
}