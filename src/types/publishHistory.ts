import type { LayoutSection, SystemTemplateKey, ThemeConfig } from './builder'

/** One archived "whole store" publish — theme + home + system template
 *  sections as they were right before being overwritten by a later
 *  "Publier". Field names mirror the `shop_publish_history` table columns
 *  directly, matching this codebase's convention (see `StorePage`). */
export interface PublishHistoryEntry {
  id: string
  shop_id: string
  theme_color: string
  theme_config: ThemeConfig
  sections: LayoutSection[]
  templates: Partial<Record<SystemTemplateKey, LayoutSection[]>>
  published_at: string
}
