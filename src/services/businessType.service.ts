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

/** Business types with at least one active template (PHASE-08 compat) — the
 *  onboarding/activity picker source. Returns `null` on any failure so callers
 *  fall back to the hardcoded legacy list (never an empty picker). */
export interface OnboardingBusinessType {
  slug: string
  name: string
  description: string | null
}

export async function fetchOnboardingBusinessTypes(): Promise<OnboardingBusinessType[] | null> {
  try {
    const [{ data: mappings, error: mapError }, { data: templates, error: templatesError }] = await Promise.all([
      supabase.from('template_business_types').select('template_id, business_type_id'),
      supabase.from('templates').select('id').eq('status', 'active'),
    ])
    if (mapError || templatesError || !templates) return null
    const activeTemplateIds = new Set(templates.map((t) => t.id))
    const typeIdsWithTemplate = new Set(
      (mappings ?? [])
        .filter((m) => activeTemplateIds.has(m.template_id))
        .map((m) => m.business_type_id),
    )
    // Need ids to join: refetch minimal id+slug map (tiny referential).
    const { data: withIds, error: idsError } = await supabase
      .from('business_types')
      .select('id, slug, name, description')
      .eq('status', 'active')
    if (idsError || !withIds) return null
    const out = withIds
      .filter((t) => typeIdsWithTemplate.has(t.id))
      .map(({ slug, name, description }) => ({ slug, name, description }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}

/** Referential id for a business-type slug (active only). Best-effort, null on
 *  any failure — callers keep writing the legacy TEXT column, backfill covers
 *  the rest. Shared by shop creation and settings so both write the FK. */
export async function resolveBusinessTypeId(slug: string | null | undefined): Promise<string | null> {
  if (!slug) return null
  try {
    const { data, error } = await supabase
      .from('business_types')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()
    if (error) return null
    return (data as { id: string } | null)?.id ?? null
  } catch {
    return null
  }
}

/** Effective business-type slug of a shop: referential first, legacy TEXT
 *  fallback (see shop_business_type_slug() — LEGACY compat until PHASE-17). */
export async function fetchShopBusinessTypeSlug(shopId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('shop_business_type_slug', { p_shop_id: shopId })
  if (error) throw error
  return (data as string | null) ?? null
}
