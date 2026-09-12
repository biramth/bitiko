import { supabase } from '@/lib/supabaseClient'
import type { Shop } from '@/types'

/**
 * Single-tenant for now: returns the first (and only) shop row.
 * Table is structured with shop_id everywhere so this can become
 * a lookup-by-domain/slug later without touching callers.
 */
export async function getShop(): Promise<Shop | null> {
  const { data, error } = await supabase.from('shops').select('*').limit(1).maybeSingle()
  if (error) throw error
  return data
}

export async function updateShop(shopId: string, updates: Partial<Shop>): Promise<Shop> {
  const { data, error } = await supabase
    .from('shops')
    .update(updates)
    .eq('id', shopId)
    .select()
    .single()
  if (error) throw error
  return data
}

const LOGO_BUCKET = 'shop-assets'

export async function uploadShopLogo(shopId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${shopId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
