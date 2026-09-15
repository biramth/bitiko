import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { SECTION_REGISTRY } from '@/features/store-builder/sectionRegistry'
import { isPreviewUpdateMessage, PREVIEW_READY, PREVIEW_SELECT } from '@/features/store-builder/previewBridge'
import { getPublishedPageBySlug } from '@/services/page.service'
import { usePageSeo } from '@/hooks/usePageSeo'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { StorePage } from '@/types/pages'
import type { LayoutSection, ThemeConfig } from '@/types/builder'

/**
 * Renders a custom page (`/pages/:slug`) using the same section renderers as
 * the home page. Inside the builder's live-preview iframe it switches to the
 * draft content streamed via postMessage, exactly like the home preview.
 */
export function StorePageView({ pageSlug }: { pageSlug?: string }) {
  const { slug: routeSlug = '' } = useParams<{ slug: string }>()
  const slug = pageSlug ? pageSlug.replace(/^pages\//, '').replace(/\/+$/, '') : routeSlug
  const { shop } = useTenant()
  const [searchParams] = useSearchParams()
  const isDraftPreview = searchParams.get('preview') === 'draft'

  const [page, setPage] = useState<StorePage | null>(null)
  const [live, setLive] = useState<{ sections: LayoutSection[]; themeColor: string; themeConfig: ThemeConfig } | null>(null)

  useEffect(() => {
    if (!shop) return
    let cancelled = false
    getPublishedPageBySlug(shop.id, slug)
      .then((p) => {
        if (!cancelled) setPage(p)
      })
      .catch(() => {
        if (!cancelled) setPage(null)
      })
    return () => {
      cancelled = true
    }
  }, [shop, slug])

  useEffect(() => {
    if (!isDraftPreview) return
    const handleMessage = (event: MessageEvent) => {
      if (isPreviewUpdateMessage(event.data)) {
        setLive({ sections: event.data.sections, themeColor: event.data.themeColor, themeConfig: event.data.themeConfig })
      }
    }
    window.addEventListener('message', handleMessage)
    if (window.parent !== window) window.parent.postMessage({ type: PREVIEW_READY }, '*')
    return () => window.removeEventListener('message', handleMessage)
  }, [isDraftPreview])

  usePageSeo({
    title: page ? `${page.title} — ${shop?.name ?? 'Boutique'}` : (shop?.name ? `${shop.name} — Boutique en ligne` : 'Boutique en ligne'),
    description: page?.seo_description ?? page?.seo_title ?? shop?.description ?? undefined,
  })

  if (!shop) return null

  // In live preview the parent streams draft sections; otherwise the page
  // must (a) exist and (b) be published to be visible.
  const sections = isDraftPreview && live ? live.sections : page?.content ?? []
  if (!isDraftPreview && !page) return <NotFoundPage />

  const themeConfig = live?.themeConfig ?? shop.theme_config

  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window

  return (
    <div className="mx-auto py-6">
      <h1 className="sr-only">{page?.title}</h1>
      {sections.map((section) => {
        const def = SECTION_REGISTRY[section.type]
        const Renderer = def.Renderer
        if (!Renderer || section.type === 'header' || section.type === 'footer') return null
        if (!section.visible) return null
        const content = <Renderer key={section.id} shop={shop} config={section.config} themeConfig={themeConfig} />
        if (!isEmbeddedPreview) return <div key={section.id}>{content}</div>
        return (
          <div
            key={section.id}
            data-preview-section
            onClick={(e) => {
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