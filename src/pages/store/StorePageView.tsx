import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { getEffectiveRegistry } from '@/features/store-builder/effectiveRegistry'
import { isPreviewUpdateMessage, PREVIEW_READY, PREVIEW_SELECT } from '@/features/store-builder/previewBridge'
import { useIsDraftPreview } from '@/features/store-builder/useEmbeddedPreview'
import { getPageBySlug, getPublishedPageBySlug } from '@/services/page.service'
import { usePageSeo } from '@/hooks/usePageSeo'
import { StoreNotFoundPage } from './StoreNotFoundPage'
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
  const isDraftPreview = useIsDraftPreview()

  // Keyed by slug so "loading" can be derived during render (comparing the
  // last-resolved slug against the current one) instead of toggled with a
  // separate synchronous setState at the top of the effect.
  const [pageResult, setPageResult] = useState<{ slug: string; page: StorePage | null } | null>(null)
  const [live, setLive] = useState<{ sections: LayoutSection[]; themeColor: string; themeConfig: ThemeConfig } | null>(null)

  useEffect(() => {
    if (!shop) return
    let cancelled = false
    // In preview mode the page may not be published yet — fetch regardless
    // of publish state (RLS still only allows the owner to see their own
    // unpublished pages); real visitors only ever see published ones.
    const fetchPage = isDraftPreview ? getPageBySlug(shop.id, slug) : getPublishedPageBySlug(shop.id, slug)
    fetchPage
      .then((p) => {
        if (!cancelled) setPageResult({ slug, page: p })
      })
      .catch(() => {
        if (!cancelled) setPageResult({ slug, page: null })
      })
    return () => {
      cancelled = true
    }
  }, [shop, slug, isDraftPreview])

  const pageLoading = pageResult?.slug !== slug
  const page = pageLoading ? null : pageResult?.page ?? null

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
    siteName: shop?.name,
  })

  if (!shop) return null
  if (pageLoading) return null

  // In the embedded builder preview, the parent streams live draft sections.
  // A standalone "Prévisualiser" tab has no parent to stream from, so it
  // falls back to the page's saved draft — matching how the home page and
  // system templates already behave (see useEffectiveConfig). Outside
  // preview, the page must exist and be published to be visible.
  const sections = isDraftPreview && live ? live.sections : isDraftPreview ? (page?.draft_content ?? page?.content ?? []) : (page?.content ?? [])
  if (!isDraftPreview && !page) return <StoreNotFoundPage />

  const themeConfig = live?.themeConfig ?? shop.theme_config

  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window

  const registry = getEffectiveRegistry(shop.template_id)

  return (
    <div className="mx-auto py-6">
      <h1 className="sr-only">{page?.title}</h1>
      {sections.map((section) => {
        const def = registry[section.type]
        const Renderer = def?.Renderer
        if (!def || !Renderer || section.type === 'header' || section.type === 'footer') return null
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