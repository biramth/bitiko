import { CORE_SECTION_REGISTRY, type SectionRegistry } from './sectionRegistry'
import { TEMPLATE_EXTRA_SECTIONS } from './templateSections'

/**
 * Resolves the section registry a shop's storefront/builder should render
 * with: the shared core sections every template can use, plus whatever
 * extra section types the shop's current template contributes (a Lookbook
 * block for the Mode template, say). A shop with no template, or one that
 * contributes nothing extra, resolves to the core registry alone —
 * identical to what `SECTION_REGISTRY` was before this indirection existed.
 */
export function getEffectiveRegistry(templateId?: string | null): SectionRegistry {
  const extras = templateId ? TEMPLATE_EXTRA_SECTIONS[templateId] : undefined
  return extras ? { ...CORE_SECTION_REGISTRY, ...extras } : CORE_SECTION_REGISTRY
}
