import type { LayoutSection } from '@/types/builder'

let counter = 0
/** Short, collision-safe id for a section instance (not persisted as a DB key, just a React/list key). */
export function createSectionId(type: string): string {
  counter += 1
  return `${type}-${Date.now().toString(36)}-${counter}`
}

/**
 * Reproduces today's hard-coded home page exactly, so shops that have never
 * opened the builder keep rendering the same layout as before this feature.
 */
export function buildDefaultSections(): LayoutSection[] {
  return [
    {
      id: createSectionId('header'),
      type: 'header',
      visible: true,
      config: { showLogo: true, showCatalogLink: true, showContactLink: false, sticky: true, menu: [] },
    },
    {
      id: createSectionId('hero'),
      type: 'hero',
      visible: true,
      config: { eyebrow: 'Boutique en ligne', heading: '', subheading: '', showBanner: true },
    },
    {
      id: createSectionId('categories'),
      type: 'categories',
      visible: true,
      config: { heading: '' },
    },
    {
      id: createSectionId('products'),
      type: 'products',
      visible: true,
      config: { heading: 'Nos produits', sort: 'recent', limit: 12 },
    },
    {
      id: createSectionId('footer'),
      type: 'footer',
      visible: true,
      config: {
        showContact: true,
        showAddress: true,
        showWhatsapp: true,
        showSocialLinks: true,
        copyrightText: '',
        hideBitikoBranding: false,
      },
    },
  ]
}

/**
 * Shops whose `layout_sections` predate the header/footer sections (or a
 * legacy row seeded before this feature) can be missing one of the two
 * pinned sections entirely, making it unreachable from the builder UI.
 * Backfills whichever is missing so every shop can always edit both.
 */
export function ensurePinnedSections(sections: LayoutSection[]): LayoutSection[] {
  const hasHeader = sections.some((s) => s.type === 'header')
  const hasFooter = sections.some((s) => s.type === 'footer')
  if (hasHeader && hasFooter) return sections

  const defaults = buildDefaultSections()
  const defaultHeader = defaults.find((s) => s.type === 'header')!
  const defaultFooter = defaults.find((s) => s.type === 'footer')!

  return [
    ...(hasHeader ? [] : [defaultHeader]),
    ...sections,
    ...(hasFooter ? [] : [defaultFooter]),
  ]
}
