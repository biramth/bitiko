import { supabase } from '@/lib/supabaseClient'
import { PRODUCTS_PAGE_SIZE, ADMIN_PRODUCTS_PAGE_SIZE } from '@/config/constants'
import { slugify } from '@/utils/format'
import type { Product, ProductVariant, ProductWithRelations } from '@/types'

export interface ProductFilters {
  shopId: string
  search?: string
  categoryId?: string
  sort?: 'recent' | 'price_asc' | 'price_desc'
  page?: number
  /** Taille de page ; défaut = grille catalogue. Une carte de restaurant en veut davantage. */
  pageSize?: number
}

export interface ProductListResult {
  products: ProductWithRelations[]
  total: number
}

export async function listActiveProducts(filters: ProductFilters): Promise<ProductListResult> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? PRODUCTS_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*), variants:product_variants(*)', {
      count: 'exact',
    })
    .eq('shop_id', filters.shopId)
    .eq('active', true)
    .order('sort_order', { foreignTable: 'product_variants', ascending: true })

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

/** Active products by id, in the given order — used by the "produits mis en avant" builder block. */
export async function getActiveProductsByIds(shopId: string, ids: string[]): Promise<ProductWithRelations[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*), variants:product_variants(*)')
    .eq('shop_id', shopId)
    .eq('active', true)
    .in('id', ids)
    .order('sort_order', { foreignTable: 'product_images', ascending: true })
    .order('sort_order', { foreignTable: 'product_variants', ascending: true })
  if (error) throw error
  const byId = new Map((data ?? []).map((p) => [p.id, p as ProductWithRelations]))
  return ids.map((id) => byId.get(id)).filter((p): p is ProductWithRelations => !!p)
}

/** Other active products worth cross-selling on a product page — same
 *  category first, backfilled with recent products if the category is thin,
 *  always excluding the product being viewed. */
export async function listRelatedProducts(
  shopId: string,
  categoryId: string | null | undefined,
  excludeProductId: string,
  limit = 4,
): Promise<ProductWithRelations[]> {
  const baseQuery = () =>
    supabase
      .from('products')
      .select('*, category:categories(*), images:product_images(*), variants:product_variants(*)')
      .eq('shop_id', shopId)
      .eq('active', true)
      .neq('id', excludeProductId)
      .order('sort_order', { foreignTable: 'product_images', ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit)

  if (categoryId) {
    const { data, error } = await baseQuery().eq('category_id', categoryId)
    if (error) throw error
    const sameCategory = (data ?? []) as ProductWithRelations[]
    if (sameCategory.length >= limit) return sameCategory

    const { data: backfillData, error: backfillError } = await baseQuery().neq('category_id', categoryId)
    if (backfillError) throw backfillError
    const backfill = (backfillData ?? []) as ProductWithRelations[]
    return [...sameCategory, ...backfill].slice(0, limit)
  }

  const { data, error } = await baseQuery()
  if (error) throw error
  return (data ?? []) as ProductWithRelations[]
}

export async function getProductBySlug(
  shopId: string,
  slug: string,
): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*), variants:product_variants(*)')
    .eq('shop_id', shopId)
    .eq('slug', slug)
    .eq('active', true)
    .order('sort_order', { foreignTable: 'product_images', ascending: true })
    .order('sort_order', { foreignTable: 'product_variants', ascending: true })
    .maybeSingle()
  if (error) throw error
  return data as ProductWithRelations | null
}

export interface AdminProductFilters {
  search?: string
  stock?: 'low' | 'out'
  categoryId?: string
  page?: number
}

export async function listShopProducts(
  shopId: string,
  filters: AdminProductFilters = {},
  lowStockThreshold = 5,
): Promise<ProductListResult> {
  const page = filters.page ?? 1
  const from = (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE
  const to = from + ADMIN_PRODUCTS_PAGE_SIZE - 1

  let query = supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*), variants:product_variants(*)', {
      count: 'exact',
    })
    .eq('shop_id', shopId)
    .order('sort_order', { foreignTable: 'product_images', ascending: true })
    .order('sort_order', { foreignTable: 'product_variants', ascending: true })
    .order('created_at', { ascending: false })

  if (filters.search) query = query.ilike('name', `%${filters.search}%`)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.stock === 'out') query = query.eq('stock', 0)
  if (filters.stock === 'low') query = query.gt('stock', 0).lte('stock', lowStockThreshold)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { products: (data ?? []) as ProductWithRelations[], total: count ?? 0 }
}

export async function generateUniqueProductSlug(
  shopId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .select('id, slug')
    .eq('shop_id', shopId)
    .ilike('slug', `${base}%`)
  if (error) throw error

  const taken = new Set(
    (data ?? [])
      .filter((p) => p.id !== excludeId)
      .map((p) => p.slug),
  )
  if (!taken.has(base)) return base
  let counter = 2
  while (taken.has(`${base}-${counter}`)) counter += 1
  return `${base}-${counter}`
}

export async function countActiveProducts(shopId: string): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .eq('active', true)
  if (error) throw error
  return count ?? 0
}

export type ProductInput = Pick<
  Product,
  'shop_id' | 'category_id' | 'name' | 'slug' | 'description' | 'price' | 'stock' | 'active' | 'badge'
> & { option_fields?: Product['option_fields'] }

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase.from('products').insert(input).select().single()
  if (error) throw error
  return data
}

export interface BulkProductRow {
  name: string
  description: string | null
  price: number
  stock: number
  categoryName: string | null
}

export interface BulkCreateResult {
  created: number
  inactive: number
}

/**
 * Creates many products sequentially (not a single batch insert) so each
 * one goes through the same slug-uniqueness and free-plan active-count
 * logic as a single manual create — a large import must not silently
 * bypass the plan's product limit.
 */
export async function bulkCreateProducts(
  shopId: string,
  rows: BulkProductRow[],
  categories: { id: string; name: string }[],
  maxActiveProducts: number | null,
): Promise<BulkCreateResult> {
  const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]))
  let activeCount = await countActiveProducts(shopId)
  let created = 0
  let inactive = 0

  for (const row of rows) {
    const canActivate = maxActiveProducts === null || activeCount < maxActiveProducts
    const slug = await generateUniqueProductSlug(shopId, slugify(row.name))
    await createProduct({
      shop_id: shopId,
      category_id: row.categoryName ? (categoryByName.get(row.categoryName.trim().toLowerCase()) ?? null) : null,
      name: row.name,
      slug,
      description: row.description,
      price: row.price,
      stock: row.stock,
      badge: null,
      active: canActivate,
    })
    created += 1
    if (canActivate) activeCount += 1
    else inactive += 1
  }

  return { created, inactive }
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

export async function deleteProductCompletely(id: string): Promise<void> {
  const { data: images } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', id)
  if (images && images.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('product-images')
      .remove(images.map((i) => i.storage_path))
    if (storageError) throw storageError
  }
  await deleteProduct(id)
}

export interface ProductStockInfo {
  id: string
  price: number
  stock: number
  active: boolean
  option_fields: unknown
  variants: Pick<ProductVariant, 'id' | 'price' | 'stock' | 'active'>[]
}

export async function listProductsByIds(
  ids: string[],
): Promise<ProductStockInfo[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('products')
    .select('id, price, stock, active, option_fields, variants:product_variants(id, price, stock, active)')
    .in('id', ids)
    .order('sort_order', { foreignTable: 'product_variants', ascending: true })
  if (error) throw error
  return (data ?? []) as ProductStockInfo[]
}
