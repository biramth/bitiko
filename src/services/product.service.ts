import { supabase } from '@/lib/supabaseClient'
import { PRODUCTS_PAGE_SIZE } from '@/config/constants'
import type { Product, ProductWithRelations } from '@/types'

export interface ProductFilters {
  shopId: string
  search?: string
  categoryId?: string
  sort?: 'recent' | 'price_asc' | 'price_desc'
  page?: number
}

export interface ProductListResult {
  products: ProductWithRelations[]
  total: number
}

export async function listActiveProducts(filters: ProductFilters): Promise<ProductListResult> {
  const page = filters.page ?? 1
  const from = (page - 1) * PRODUCTS_PAGE_SIZE
  const to = from + PRODUCTS_PAGE_SIZE - 1

  let query = supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*)', { count: 'exact' })
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
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { products: (data ?? []) as ProductWithRelations[], total: count ?? 0 }
}

export async function getProductBySlug(
  shopId: string,
  slug: string,
): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*)')
    .eq('shop_id', shopId)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()
  if (error) throw error
  return data as ProductWithRelations | null
}

export async function listShopProducts(shopId: string): Promise<ProductWithRelations[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ProductWithRelations[]
}

export type ProductInput = Pick<
  Product,
  'shop_id' | 'category_id' | 'name' | 'slug' | 'description' | 'price' | 'stock' | 'active'
>

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase.from('products').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateProduct(
  id: string,
  updates: Partial<ProductInput>,
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}
