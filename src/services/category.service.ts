import { supabase } from '@/lib/supabaseClient'
import { compressImageFile } from '@/utils/image'
import type { Category } from '@/types'

export type CategoryKind = 'product' | 'service'

/** Catégories d'une boutique pour un catalogue : produits (défaut) ou prestations. */
export async function listCategories(shopId: string, kind: CategoryKind = 'product'): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('shop_id', shopId)
    .eq('kind', kind)
    .order('position', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createCategory(input: {
  shopId: string
  name: string
  slug: string
  emoji?: string | null
  description?: string | null
  color?: string | null
  kind?: CategoryKind
}): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      shop_id: input.shopId,
      name: input.name,
      slug: input.slug,
      emoji: input.emoji ?? null,
      description: input.description ?? null,
      color: input.color ?? null,
      kind: input.kind ?? 'product',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export type CategoryUpdate = Partial<
  Pick<Category, 'name' | 'slug' | 'position' | 'emoji' | 'description' | 'color' | 'image_url'>
>

export async function updateCategory(id: string, updates: CategoryUpdate): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Persists a full ordering (admin drag/reorder). Positions are rewritten 0..n-1 in the given id order. */
export async function reorderCategories(shopId: string, orderedIds: string[]): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase.from('categories').update({ position: index }).eq('id', id).eq('shop_id', shopId)
    if (error) throw error
  }
}

export async function deleteCategory(id: string): Promise<void> {
  await removeCategoryStorageImages(id)
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

/** Uploads a cover image for a category and returns its public URL (caller stores it in image_url). */
export async function uploadCategoryImage(categoryId: string, file: File): Promise<string> {
  const optimized = await compressImageFile(file)
  const ext = optimized.name.split('.').pop()
  const path = `${categoryId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage.from('category-images').upload(path, optimized, {
    cacheControl: '3600',
    upsert: false,
  })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('category-images').getPublicUrl(path)
  return data.publicUrl
}

/** Best-effort cleanup of a category's cover images in storage. */
async function removeCategoryStorageImages(categoryId: string): Promise<void> {
  try {
    const { data, error } = await supabase.storage.from('category-images').list(categoryId)
    if (error || !data || data.length === 0) return
    await supabase.storage
      .from('category-images')
      .remove(data.map((item) => `${categoryId}/${item.name}`))
  } catch {
    // Never block the category deletion on a storage cleanup failure.
  }
}

/** Reassigns every product of the source category to the target, then removes the source. */
export async function mergeCategories(sourceId: string, targetId: string): Promise<void> {
  const { error: moveError } = await supabase
    .from('products')
    .update({ category_id: targetId })
    .eq('category_id', sourceId)
  if (moveError) throw moveError
  await removeCategoryStorageImages(sourceId)
  const { error: deleteError } = await supabase.from('categories').delete().eq('id', sourceId)
  if (deleteError) throw deleteError
}

/** Moves all products of the given categories to a target category (the source categories are kept). */
export async function moveProductsToCategory(sourceIds: string[], targetId: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ category_id: targetId })
    .in('category_id', sourceIds)
  if (error) throw error
}

/** Bulk delete: only categories without products survive the FK restrict — the DB rejects the rest. */
export async function deleteCategories(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => removeCategoryStorageImages(id)))
  const { error } = await supabase.from('categories').delete().in('id', ids)
  if (error) throw error
}

export async function generateUniqueCategorySlug(shopId: string, base: string): Promise<string> {
  const { data, error } = await supabase
    .from('categories')
    .select('slug')
    .eq('shop_id', shopId)
    .ilike('slug', `${base}%`)
  if (error) throw error

  const taken = new Set((data ?? []).map((c) => c.slug))
  if (!taken.has(base)) return base
  let counter = 2
  while (taken.has(`${base}-${counter}`)) counter += 1
  return `${base}-${counter}`
}