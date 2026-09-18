import { useTenant } from '@/features/tenant/TenantContext'
import { SectionList } from './SectionList'
import { useEffectiveTemplateConfig } from './useEffectiveShopConfig'
import type { SystemTemplateKey } from '@/types/builder'

/** Renders a system template's body sections (catalogue, product, cart,
 *  checkout). Header/footer are always rendered globally by StoreLayout from
 *  the home page. */
export function TemplateBody({ template }: { template: SystemTemplateKey }) {
  const { shop } = useTenant()
  const { bodySections, themeConfig, isDraftPreview, inlineEditable } = useEffectiveTemplateConfig(shop, template)
  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window

  if (!shop) return null

  return (
    <div>
      <SectionList
        sections={bodySections}
        shop={shop}
        themeConfig={themeConfig}
        isEmbeddedPreview={isEmbeddedPreview}
        inlineEditable={inlineEditable}
      />
    </div>
  )
}