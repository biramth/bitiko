import { supabase } from '@/lib/supabaseClient'
import { STORE_TEMPLATES, templatesForVertical } from '@/config/storeTemplates'
import type { StoreTemplate } from '@/types/builder'

/** Template slugs compatible with a shop's effective business type (DB-driven
 *  compatibility, PHASE-08). Returns `null` on error so callers fall back to
 *  the legacy per-vertical list — never an empty picker on failure. */
export async function fetchCompatibleTemplateSlugs(shopId: string): Promise<string[] | null> {
  try {
    const { data, error } = await supabase.rpc('shop_template_slugs', { p_shop_id: shopId })
    if (error) return null
    return (data ?? []) as string[]
  } catch {
    return null
  }
}

/** Template slugs serving a business-type slug (DB compatibility, active only).
 *  Returns `null` on error so callers fall back to legacy lists. */
export async function fetchTemplateSlugsForTypeSlug(typeSlug: string): Promise<string[] | null> {
  try {
    const [{ data: types }, { data: mappings }, { data: templates }] = await Promise.all([
      supabase.from('business_types').select('id, slug').eq('status', 'active'),
      supabase.from('template_business_types').select('template_id, business_type_id'),
      supabase.from('templates').select('id, slug').eq('status', 'active'),
    ])
    if (!types || !mappings || !templates) return null
    const typeId = types.find((t) => t.slug === typeSlug)?.id
    if (!typeId) return null
    const templateIds = new Set(
      mappings.filter((m) => m.business_type_id === typeId).map((m) => m.template_id),
    )
    const slugs = templates.filter((t) => templateIds.has(t.id)).map((t) => t.slug)
    return slugs.length > 0 ? slugs : null
  } catch {
    return null
  }
}

/** Resolves the picker list: DB compatibility wins when it yields templates,
 *  otherwise the legacy per-vertical list (fail-open). Pure — unit-tested. */
export function resolvePickerTemplates(
  slugs: string[] | null,
  legacyVertical: string | null | undefined,
): StoreTemplate[] {
  const legacy = templatesForVertical(legacyVertical)
  if (!slugs || slugs.length === 0) return legacy
  const wanted = new Set(slugs)
  const filtered = STORE_TEMPLATES.filter((t) => wanted.has(t.key))
  return filtered.length > 0 ? filtered : legacy
}
