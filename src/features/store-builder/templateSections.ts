import { Images } from 'lucide-react'
import { createSectionId } from '@/config/defaultLayout'
import { LookbookEditor, LookbookRenderer } from './sections/LookbookSection'
import type { SectionDefinition, SectionRegistry } from './sectionRegistry'
import type { LookbookSectionConfig } from '@/types/builder'

const lookbook: SectionDefinition = {
  label: 'Lookbook',
  description: 'Une galerie de photos éditoriales, façon lookbook mode.',
  icon: Images,
  color: 'from-rose-500 to-rose-700',
  category: 'content',
  pinned: false,
  createDefault: () => ({
    id: createSectionId('lookbook'),
    type: 'lookbook',
    visible: true,
    config: { heading: 'Lookbook', images: [] } satisfies LookbookSectionConfig,
  }),
  Editor: LookbookEditor,
  Renderer: LookbookRenderer,
}

/**
 * Extra section types each template contributes on top of the core
 * registry, keyed by `StoreTemplate.key` (a specific template, not a whole
 * vertical — a future second Mode template isn't forced to also offer
 * Lookbook). Consumed by `getEffectiveRegistry` in effectiveRegistry.ts.
 *
 * This is the file a new template-specific section gets added to: define
 * its Renderer/Editor in its own file under `sections/`, describe it here,
 * and list it under whichever template key(s) should offer it — no shared
 * builder component (sidebar, editor panel, storefront renderers) needs to
 * change.
 */
export const TEMPLATE_EXTRA_SECTIONS: Record<string, SectionRegistry> = {
  mode: { lookbook },
  minimal: { lookbook },
}
