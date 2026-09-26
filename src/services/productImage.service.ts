import { supabase } from '@/lib/supabaseClient'
import { compressImageFile, makeThumbFile } from '@/utils/image'
import type { ProductImage } from '@/types'

const BUCKET = 'product-images'

/** Les chemins contiennent un UUID donc sont immuables : cache navigateur/CDN d'un an. */
const IMMUTABLE_CACHE = '31536000'

export async function uploadProductImage(
  productId: string,
  file: File,
  sortOrder: number,
): Promise<ProductImage> {
  // Free plan has no server-side transforms: shrink at the source so every
  // storefront (grids, lightbox) serves a light file from day one. The thumb
  // feeds cards and thumbnails; the full file feeds the product page and
  // lightbox. Old rows keep thumb_* NULL and the front falls back to the
  // full file, so no backfill is needed.
  const optimized = await compressImageFile(file)
  const ext = optimized.name.split('.').pop()
  const id = crypto.randomUUID()
  const path = `${productId}/${id}.${ext}`
  const thumb = await makeThumbFile(file)
  const thumbPath = thumb ? `${productId}/${id}-thumb.webp` : null

  const [{ error: fullError }, { error: thumbError }] = await Promise.all([
    supabase.storage.from(BUCKET).upload(path, optimized, {
      cacheControl: IMMUTABLE_CACHE,
      upsert: false,
    }),
    thumb && thumbPath
      ? supabase.storage.from(BUCKET).upload(thumbPath, thumb, {
          cacheControl: IMMUTABLE_CACHE,
          upsert: false,
        })
      : Promise.resolve({ error: null }),
  ])
  if (fullError) throw fullError
  if (thumbError) throw thumbError

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const thumbUrl = thumbPath ? supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl : null

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: path,
      public_url: publicUrlData.publicUrl,
      sort_order: sortOrder,
      thumb_url: thumbUrl,
      thumb_path: thumbPath,
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
  const paths = [image.storage_path, image.thumb_path].filter((p): p is string => !!p)
  const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths)
  if (storageError) throw storageError

  const { error } = await supabase.from('product_images').delete().eq('id', image.id)
  if (error) throw error
}
