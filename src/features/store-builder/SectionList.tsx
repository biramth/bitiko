import { PREVIEW_SELECT } from './previewBridge'
import { getEffectiveRegistry } from './effectiveRegistry'
import type { Shop } from '@/types'
import type { LayoutSection, ThemeConfig } from '@/types/builder'

/** Renders a list of body sections (header/footer are handled separately by
 *  StoreLayout). In embedded-preview mode each block is wrapped with a
 *  click-to-select handler so the merchant can click straight to edit it. */
export function SectionList({
  sections,
  shop,
  themeConfig,
  isEmbeddedPreview,
  inlineEditable = false,
}: {
  sections: LayoutSection[]
  shop: Shop
  themeConfig: ThemeConfig
  isEmbeddedPreview: boolean
  /** Whether Renderers should show their direct-edit affordances (text,
   *  images, buttons…) — a Renderer that doesn't support inline editing
   *  simply ignores these extra props. */
  inlineEditable?: boolean
}) {
  const registry = getEffectiveRegistry(shop.template_id)
  return (
    <>
      {sections.map((section) => {
        const def = registry[section.type]
        const Renderer = def?.Renderer
        if (!Renderer) return null
        const content = (
          <Renderer shop={shop} config={section.config} themeConfig={themeConfig} sectionId={section.id} editable={inlineEditable} />
        )
        if (!isEmbeddedPreview) return <div key={section.id}>{content}</div>
        return (
          <div
            key={section.id}
            data-preview-section
            onClick={(e) => {
              // Note: no preventDefault here — themed links (product cards,
              // "Tout voir", menus) must keep navigating inside the preview so
              // the editor can follow the page (voir "suivre la page").
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
    </>
  )
}
