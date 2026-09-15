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
      config: { showLogo: true, showCatalogLink: true, showContactLink: true, sticky: true },
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
      },
    },
  ]
}
