import { supabase } from '@/lib/supabaseClient'
import { ensurePinnedSections } from '@/config/defaultLayout'
import { STORE_TEMPLATES, STORE_TEMPLATE_BY_KEY } from '@/config/storeTemplates'
import type { StoreVibeKey } from '@/config/ambiances'
import type { Shop, TenantContext } from '@/types'
import type { SystemTemplateMap } from '@/types/builder'
import { generateStorefront, type StoreBrandPalette } from '@/features/onboarding/generateStorefront'
import type { StoreProfileAnswers } from '@/features/onboarding/storeProfile'

export async function getShopByTenant(tenant: TenantContext): Promise<Shop | null> {
  if (tenant.type !== 'shop') return null

  const { data, error } = await supabase.from('shops').select('*').ilike('slug', tenant.slug).maybeSingle()
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
  /** Genre template key (mode, epicerie, beaute, tech) picked during onboarding. */
  templateId?: string
  /** The merchant's onboarding answers — when present, the storefront is
   *  generated from them instead of the template's generic copy. */
  profile?: StoreProfileAnswers
  /** Palette suggested from the merchant's logo, used to set the theme colors. */
  palette?: StoreBrandPalette | null
  /** The ambiance picked during onboarding ("Épuré", "Cosy"…), which styles
   *  the generated theme on top of the template + logo colors. */
  vibe?: StoreVibeKey | null
}

/** Flattens a selected genre template into the shop record so the storefront
 *  renders it (theme + home page + the four commerce pages) right away. */
function templateFields(templateId: string | undefined): Partial<Shop> {
  const template = templateId ? STORE_TEMPLATE_BY_KEY[templateId] : undefined
  if (!template) return {}
  const systemTemplates: SystemTemplateMap = {
    catalogue: { published: template.layout.catalogue },
    product: { published: template.layout.product },
    cart: { published: template.layout.cart },
    checkout: { published: template.layout.checkout },
  }
  return {
    template_id: template.key,
    business_type: template.vertical,
    theme_color: template.themeColor,
    theme_config: template.themeConfig,
    layout_sections: ensurePinnedSections(template.layout.home),
    page_templates: systemTemplates,
  }
}

export async function createShop(input: CreateShopInput): Promise<Shop> {
  const template = input.templateId ? STORE_TEMPLATE_BY_KEY[input.templateId] : undefined
  const generatedSource = template ?? STORE_TEMPLATES[0]
  const generated = input.profile
    ? generateStorefront({ template: generatedSource, answers: input.profile, palette: input.palette, vibe: input.vibe })
    : null

  const { data, error } = await supabase
    .from('shops')
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      slug: input.slug,
      whatsapp_number: input.whatsappNumber,
      currency: input.currency ?? 'XOF',
      vibe: input.vibe ?? null,
      ...(generated
        ? {
            onboarding_responses: input.profile,
            description: generated.description,
            template_id: generatedSource.key,
            business_type: generatedSource.vertical,
            theme_color: generated.themeColor,
            theme_config: generated.themeConfig,
            layout_sections: generated.layoutSections,
            page_templates: generated.pageTemplates,
          }
        : templateFields(input.templateId)),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Best-effort welcome email right after onboarding — never blocks shop creation if it fails. */
export async function sendWelcomeEmail(shopId: string): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return
    await fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ shopId }),
    })
  } catch {
    // Non-critical — the merchant's shop already exists regardless.
  }
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

const SHOP_ASSETS_BUCKET = 'shop-assets'

async function uploadShopAsset(shopId: string, file: File, baseName: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${shopId}/${baseName}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(SHOP_ASSETS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (uploadError) throw uploadError

  // Cache-bust: upsert keeps the same URL, so browsers/CDN would otherwise
  // keep serving the previous image after a merchant replaces it.
  const { data } = supabase.storage.from(SHOP_ASSETS_BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export function uploadShopLogo(shopId: string, file: File): Promise<string> {
  return uploadShopAsset(shopId, file, 'logo')
}

export function uploadShopBanner(shopId: string, file: File): Promise<string> {
  return uploadShopAsset(shopId, file, 'banner')
}

/** Image for a builder block (image/promo sections) — one file per section id,
 *  or per `itemId` for a block holding several images (e.g. a Lookbook's
 *  photo grid), so each slot gets its own storage path instead of
 *  overwriting the same one. */
export function uploadShopSectionImage(shopId: string, sectionId: string, file: File, itemId?: string): Promise<string> {
  return uploadShopAsset(shopId, file, itemId ? `section-${sectionId}-${itemId}` : `section-${sectionId}`)
}
