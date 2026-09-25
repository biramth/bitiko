import { supabase } from '@/lib/supabaseClient'

export interface BusinessType {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  status: 'active' | 'deprecated' | 'draft'
  shops?: number
}

export interface Capability {
  id: string
  code: string
  label: string
  description: string | null
  category: string
  status: 'active' | 'deprecated' | 'draft'
}

export interface BusinessTypeMapping {
  business_type_id: string
  capability_id: string
}

/** Groups capabilities by category for the admin UI (and later, for workspace /
 *  frontstore adaptation buckets). Pure function — unit-tested. */
export function groupCapabilitiesByCategory(caps: Capability[]): { category: string; items: Capability[] }[] {
  const groups = new Map<string, Capability[]>()
  for (const cap of caps) {
    const list = groups.get(cap.category) ?? []
    list.push(cap)
    groups.set(cap.category, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([category, items]) => ({
      category,
      items: [...items].sort((x, y) => x.label.localeCompare(y.label, 'fr')),
    }))
}

/** Server-side capability read for a business-type slug (active type + active
 *  capabilities). Used by the workspace generator (PHASE-06) and the adaptive
 *  frontstore (PHASE-07) — never hardcoded lists. */
export async function fetchBusinessCapabilities(slug: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('business_type_capability_codes', { p_slug: slug })
  if (error) throw error
  return (data ?? []) as string[]
}

/** Effective business-type slug of a shop: referential first, legacy TEXT
 *  fallback (see shop_business_type_slug() — LEGACY compat until PHASE-17). */
export async function fetchShopBusinessTypeSlug(shopId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('shop_business_type_slug', { p_shop_id: shopId })
  if (error) throw error
  return (data as string | null) ?? null
}
