import { CORE_SECTION_REGISTRY, type SectionRegistry } from './sectionRegistry'

/**
 * Resolves the section registry a shop's storefront/builder should render
 * with: the shared core sections every template can use, plus whatever
 * extra section types the shop's current template contributes (a Lookbook
 * block for a Mode template, a Menu block for a Restaurant one, …).
 *
 * No template contributes extra sections yet — every shop resolves to the
 * core registry, identical to what `SECTION_REGISTRY` was before this
 * indirection existed. This is deliberately the seam: once a template
 * definition can declare its own sections (a later phase), only this
 * function's body changes — every call site below already resolves through
 * it instead of importing the core registry directly.
 */
export function getEffectiveRegistry(templateId?: string | null): SectionRegistry {
  void templateId
  return CORE_SECTION_REGISTRY
}
