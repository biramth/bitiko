import type { StoreTemplate } from '@/types/builder'

/** A tiny CSS-only storefront mockup so a template reads as "a real shop", not a color swatch.
 *  Uses the template's home layout to pick the mockup composition. */
export function TemplateThumbnail({ template }: { template: StoreTemplate }) {
  const [accent, secondary] = template.swatch
  const hasCategories = template.layout.home.some((s) => s.type === 'categories')

  return (
    <div
      className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white"
      style={{ fontFamily: template.themeConfig.font === 'inter' ? 'Inter, sans-serif' : undefined }}
    >
      <div className="flex h-2.5 items-center justify-between bg-white px-1.5">
        <span className="h-1 w-3 rounded-full" style={{ backgroundColor: template.themeColor }} />
        <span className="h-1 w-1 rounded-full bg-gray-300" />
      </div>
      <div className="h-5 w-full" style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})` }} />
      <div className="flex gap-1 p-1.5">
        {hasCategories ? (
          <>
            <span className="h-6 flex-1 rounded-sm" style={{ backgroundColor: template.themeColor }} />
            <span className="h-6 flex-1 rounded-sm" style={{ backgroundColor: secondary }} />
            <span className="h-6 flex-1 rounded-sm" style={{ backgroundColor: template.themeConfig.textColor, opacity: 0.15 }} />
          </>
        ) : (
          <>
            <span className="h-6 flex-1 rounded-sm bg-gray-100" />
            <span className="h-6 flex-1 rounded-sm bg-gray-100" />
            <span className="h-6 flex-1 rounded-sm bg-gray-100" />
          </>
        )}
      </div>
    </div>
  )
}
