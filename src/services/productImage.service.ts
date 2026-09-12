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

export async function deleteProductImage(image: ProductImage): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([image.storage_path])
  if (storageError) throw storageError

  const { error } = await supabase.from('product_images').delete().eq('id', image.id)
  if (error) throw error
}
