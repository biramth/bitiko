import { supabase } from '@/lib/supabaseClient'
import type { Shop, TenantContext } from '@/types'

export async function getShopByTenant(tenant: TenantContext): Promise<Shop | null> {
  if (tenant.type !== 'shop') return null

  if (tenant.slug !== undefined) {
    const { data, error } = await supabase.from('shops').select('*').ilike('slug', tenant.slug).maybeSingle()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .ilike('custom_domain', tenant.customDomain)
    .maybeSingle()
  if (error) throw error
  return data
}

/** The shop owned by the currently authenticated merchant (admin dashboard). */
export async function getMyShop(userId: string): Promise<Shop | null> {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('shops')
    .select('id')
    .ilike('slug', slug)
    .maybeSingle()
  if (error) throw error
  return !data
}

export interface CreateShopInput {
  ownerId: string
  name: string
  slug: string
  whatsappNumber: string
  currency?: string
}

export async function createShop(input: CreateShopInput): Promise<Shop> {
  const { data, error } = await supabase
    .from('shops')
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      slug: input.slug,
      whatsapp_number: input.whatsappNumber,
      currency: input.currency ?? 'XOF',
    })
    .select()
    .single()
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
