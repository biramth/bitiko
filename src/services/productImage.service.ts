import { supabase } from '@/lib/supabaseClient'
import type { ProductImage } from '@/types'

const BUCKET = 'product-images'

export async function uploadProductImage(
  productId: string,
  file: File,
  sortOrder: number,
): Promise<ProductImage> {
  const ext = file.name.split('.').pop()
  const path = `${productId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: path,
      public_url: publicUrlData.publicUrl,
      sort_order: sortOrder,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Re-applies sort_order from the given ordered list (drag-and-drop reorder). */
export async function reorderProductImages(ordered: { id: string; sort_order: number }[]): Promise<void> {
  const updates = ordered.map(({ id, sort_order }) =>
    supabase.from('product_images').update({ sort_order }).eq('id', id),
  )
  const results = await Promise.all(updates)
  const error = results.find((r) => r.error)?.error
  if (error) throw error
}

export async function deleteProductImage(image: ProductImage): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([image.storage_path])
  if (storageError) throw storageError

  const { error } = await supabase.from('product_images').delete().eq('id', image.id)
  if (error) throw error
}
