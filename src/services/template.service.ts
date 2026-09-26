import { supabase } from '@/lib/supabaseClient'
import { STORE_TEMPLATES, templatesForVertical } from '@/config/storeTemplates'
import { CORE_SECTION_REGISTRY } from '@/features/store-builder/sectionRegistry'
import type {
  StoreTemplate,
  StoreTemplateLayout,
  TemplateVariant,
  TextScale,
  ThemeConfig,
} from '@/types/builder'

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

// ── Contenu piloté par données (sans déploiement) ──────────────────────────
// `templates.content` (édité depuis l'admin plateforme) surcharge le gabarit
// code de même slug, ou ajoute un gabarit 100 % base s'il porte un vertical.
// Tout le reste (compatibilités, statuts) continue de passer par le catalogue.

export interface DbTemplateRow {
  slug: string
  name: string
  description: string | null
  status: string
  content: TemplateContent | null
}

export interface TemplateContent {
  themeColor?: string
  themeConfig?: ThemeConfig
  layout?: StoreTemplateLayout
  variants?: TemplateVariant[]
  vertical?: string
}

const KNOWN_SECTION_TYPES = new Set(Object.keys(CORE_SECTION_REGISTRY).concat('lookbook'))

const THEME_FONTS = new Set(['sora-inter', 'inter', 'sora'])
const TEXT_SCALES: TextScale[] = ['sm', 'base', 'lg']

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** Valide un contenu de gabarit (éditeur admin, scaffolder, seed). Retourne
 *  la liste des erreurs — vide = valide. Pure — unit-testée. */
export function validateTemplateContent(input: unknown): string[] {
  const errors: string[] = []
  if (!isRecord(input)) return ['Le contenu doit être un objet JSON.']
  if (input.themeColor !== undefined && typeof input.themeColor !== 'string') {
    errors.push('themeColor doit être une chaîne.')
  }
  if (input.themeConfig !== undefined) {
    if (!isRecord(input.themeConfig)) {
      errors.push('themeConfig doit être un objet.')
    } else {
      const theme = input.themeConfig as Record<string, unknown>
      for (const key of ['secondaryColor', 'textColor', 'backgroundColor', 'buttonColor', 'font', 'textScale', 'radius', 'contentWidth']) {
        if (typeof theme[key] !== 'string') errors.push(`themeConfig.${key} doit être une chaîne.`)
      }
      if (theme.font !== undefined && !THEME_FONTS.has(theme.font as string)) {
        errors.push('themeConfig.font doit valoir sora-inter, inter ou sora.')
      }
      if (theme.textScale !== undefined && !(TEXT_SCALES as string[]).includes(theme.textScale as string)) {
        errors.push('themeConfig.textScale doit valoir sm, base ou lg.')
      }
    }
  }
  if (input.layout !== undefined) {
    if (!isRecord(input.layout)) {
      errors.push('layout doit être un objet.')
    } else {
      const layout = input.layout as Record<string, unknown>
      for (const key of ['home', 'catalogue', 'product', 'cart', 'checkout']) {
        const sections = layout[key]
        if (!Array.isArray(sections)) {
          errors.push(`layout.${key} doit être une liste de sections.`)
          continue
        }
        sections.forEach((section, index) => {
          if (!isRecord(section) || typeof section.id !== 'string' || typeof section.type !== 'string') {
            errors.push(`layout.${key}[${index}] : id et type requis.`)
          } else if (!KNOWN_SECTION_TYPES.has(section.type)) {
            errors.push(`layout.${key}[${index}] : type inconnu « ${section.type} ».`)
          }
          if (isRecord(section) && (section.config === null || typeof section.config !== 'object')) {
            errors.push(`layout.${key}[${index}] : config doit être un objet.`)
          }
        })
      }
    }
  }
  if (input.variants !== undefined) {
    if (!Array.isArray(input.variants)) {
      errors.push('variants doit être une liste.')
    } else {
      input.variants.forEach((variant, index) => {
        if (!isRecord(variant) || typeof variant.key !== 'string' || typeof variant.themeColor !== 'string') {
          errors.push(`variants[${index}] : key et themeColor requis.`)
        }
        if (isRecord(variant) && variant.themeConfig !== undefined) {
          const nested = validateTemplateContent({ themeConfig: variant.themeConfig })
          nested.forEach((e) => errors.push(`variants[${index}] : ${e}`))
        }
      })
    }
  }
  if (input.vertical !== undefined && typeof input.vertical !== 'string') {
    errors.push('vertical doit être une chaîne.')
  }
  return errors
}

/** Contenus actifs (templates.status = active, content non null). */
export async function fetchTemplateContents(): Promise<DbTemplateRow[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('slug, name, description, status, content')
    .eq('status', 'active')
    .not('content', 'is', null)
  if (error) throw error
  return (data ?? []) as DbTemplateRow[]
}

/** Fusionne code + base : surcharge les slugs connus, ajoute les gabarits
 *  100 % base portant un vertical. Pure — unit-testée. */
export function mergeDbTemplates(
  code: StoreTemplate[],
  rows: DbTemplateRow[],
): StoreTemplate[] {
  const bySlug = new Map(code.map((t) => [t.key, t]))
  const merged = code.map((template) => {
    const row = rows.find((r) => r.slug === template.key)
    if (!row?.content) return template
    // Contenu invalide = on garde le gabarit code (fail-open, jamais de
    // frontstore cassé par une édition admin).
    if (validateTemplateContent(row.content).length > 0) return template
    const { vertical: _vertical, ...content } = row.content
    return { ...template, ...content }
  })
  for (const row of rows) {
    if (!row.content || bySlug.has(row.slug)) continue
    const { themeColor, themeConfig, layout, variants, vertical } = row.content
    if (!themeColor || !themeConfig || !layout || !vertical) continue
    if (validateTemplateContent(row.content).length > 0) continue
    merged.push({
      key: row.slug,
      vertical,
      label: row.name,
      description: row.description ?? '',
      swatch: [themeColor, themeConfig.secondaryColor],
      themeColor,
      themeConfig,
      layout,
      variants,
    })
  }
  return merged
}
