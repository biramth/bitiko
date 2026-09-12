import { supabase } from '@/lib/supabaseClient'
import type { Category } from '@/types'

export async function listCategories(shopId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('shop_id', shopId)
    .order('name')
  if (error) throw error
  return data
}

export async function createCategory(input: {
  shopId: string
  name: string
  slug: string
}): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ shop_id: input.shopId, name: input.name, slug: input.slug })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, 'name' | 'slug'>>,
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}
