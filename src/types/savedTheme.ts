import type { LayoutSection, SystemTemplateKey, ThemeConfig } from './builder'

/** A merchant's own saved design — theme + home + system template sections —
 *  distinct from the four built-in per-vertical templates in
 *  config/storeTemplates.ts. Field names mirror the `shop_saved_themes`
 *  table columns directly, matching this codebase's convention (see
 *  `StorePage`) rather than a camelCase DTO layer. */
export interface SavedTheme {
  id: string
  shop_id: string
  name: string
  theme_color: string
  theme_config: ThemeConfig
  sections: LayoutSection[]
  templates: Partial<Record<SystemTemplateKey, LayoutSection[]>>
  created_at: string
  updated_at: string
}
