import { useTenant } from '@/features/tenant/TenantContext'
import { useEffectiveShopConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { SECTION_REGISTRY } from '@/features/store-builder/sectionRegistry'
import { PREVIEW_SELECT } from '@/features/store-builder/previewBridge'
import { usePageSeo } from '@/hooks/usePageSeo'

export function HomePage() {
  const { shop } = useTenant()
  usePageSeo({
    title: shop ? `${shop.name} — Boutique en ligne` : 'Boutique en ligne',
    description: shop?.description ?? undefined,
    image: shop?.banner_url ?? shop?.logo_url,
  })
  const { bodySections, themeConfig, isDraftPreview } = useEffectiveShopConfig(shop)

  // Inside the builder's live-preview iframe, a click selects a section
  // instead of navigating, so the merchant can click straight to edit it.
  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window

  if (!shop) return null

  return (
    <div>
      {bodySections.map((section) => {
        const def = SECTION_REGISTRY[section.type]
        const Renderer = def.Renderer
        if (!Renderer) return null
        const content = <Renderer shop={shop} config={section.config} themeConfig={themeConfig} />
        if (!isEmbeddedPreview) return <div key={section.id}>{content}</div>

        return (
          <div
            key={section.id}
            data-preview-section
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              window.parent?.postMessage({ type: PREVIEW_SELECT, sectionId: section.id }, '*')
            }}
            className="preview-section group relative cursor-pointer"
          >
            {content}
            <span className="pointer-events-none absolute left-2 top-2 z-20 rounded-md bg-brand-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              {def.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
