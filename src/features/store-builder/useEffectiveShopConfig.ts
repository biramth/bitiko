import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEFAULT_THEME_CONFIG } from '@/config/themeTokens'
import { buildDefaultSections } from '@/config/defaultLayout'
import { buildDefaultSystemTemplate } from '@/config/defaultTemplates'
import { isPreviewUpdateMessage, PREVIEW_READY, type PreviewUpdateMessage } from './previewBridge'
import type { Shop } from '@/types'
import type { LayoutSection, SystemTemplateKey, ThemeConfig } from '@/types/builder'

export type EffectiveTemplateKey = 'home' | SystemTemplateKey

interface EffectiveConfig {
  sections: LayoutSection[]
  themeColor: string
  themeConfig: ThemeConfig
  announcementSection: LayoutSection | undefined
  headerSection: LayoutSection | undefined
  footerSection: LayoutSection | undefined
  bodySections: LayoutSection[]
  isDraftPreview: boolean
}

/**
 * Resolves which theme/layout a shop should render with: the published
 * columns normally, or — when loaded with `?preview=draft` inside the
 * builder's live-preview iframe — whatever the parent editor last posted via
 * `previewBridge`, so every keystroke shows up instantly with no DB write.
 * Falls back to the shop's saved `builder_draft` for the "Preview" button
 * opened as a plain tab, where there is no parent window to sync with.
 *
 * `templateKey` picks a system template (catalogue, product, cart, checkout)
 * resolved from `shops.page_templates`; 'home' (default) keeps using the
 * legacy `layout_sections` / `builder_draft` columns.
 */
export function useEffectiveConfig(
  shop: Shop | null | undefined,
  templateKey: EffectiveTemplateKey = 'home',
): EffectiveConfig {
  const [searchParams] = useSearchParams()
  const isDraftPreview = searchParams.get('preview') === 'draft'
  const [liveUpdate, setLiveUpdate] = useState<PreviewUpdateMessage | null>(null)

  useEffect(() => {
    if (!isDraftPreview) return
    const handleMessage = (event: MessageEvent) => {
      if (isPreviewUpdateMessage(event.data)) setLiveUpdate(event.data)
    }
    window.addEventListener('message', handleMessage)
    if (window.parent !== window) window.parent.postMessage({ type: PREVIEW_READY }, '*')
    return () => window.removeEventListener('message', handleMessage)
  }, [isDraftPreview])

  const homeDraft = liveUpdate ?? (isDraftPreview ? shop?.builder_draft : null)

  // A live editor update carries the template it was sent for (`templateKey`
  // field), so the same iframe preview honours the section set the merchant is
  // currently editing while still streaming every keystroke instantly.
  const templateUpdate =
    liveUpdate != null && (liveUpdate.templateKey ?? 'home') === templateKey ? liveUpdate : null

  let sections: LayoutSection[]
  let themeColor: string
  let themeConfig: ThemeConfig
  let draftThemeColor: string | undefined
  let draftThemeConfig: ThemeConfig | undefined

  if (templateKey === 'home') {
    themeColor = homeDraft?.themeColor ?? shop?.theme_color ?? '#d9612e'
    themeConfig = homeDraft?.themeConfig ?? shop?.theme_config ?? DEFAULT_THEME_CONFIG
    sections = homeDraft?.sections ?? shop?.layout_sections ?? buildDefaultSections()
  } else {
    const stored = shop?.page_templates?.[templateKey]
    const published: LayoutSection[] | undefined = stored?.published
    // Drafts (from a saved store-wide template) only render in preview mode,
    // like the home page — customers always see the published layout.
    const draftSections: LayoutSection[] | undefined =
      templateUpdate?.sections ?? (isDraftPreview ? shop?.builder_draft?.templates?.[templateKey] : undefined)
    sections = draftSections ?? published ?? buildDefaultSystemTemplate(templateKey)
    draftThemeColor = templateUpdate?.themeColor ?? homeDraft?.themeColor
    draftThemeConfig = templateUpdate?.themeConfig ?? homeDraft?.themeConfig
    themeColor = draftThemeColor ?? shop?.theme_color ?? '#d9612e'
    themeConfig = draftThemeConfig ?? shop?.theme_config ?? DEFAULT_THEME_CONFIG
  }

  const announcementSection = sections.find((s) => s.type === 'announcement' && s.visible)
  const headerSection = sections.find((s) => s.type === 'header' && s.visible)
  const footerSection = sections.find((s) => s.type === 'footer' && s.visible)
  const bodySections = sections.filter(
    (s) => s.type !== 'announcement' && s.type !== 'header' && s.type !== 'footer' && s.visible,
  )

  return { sections, themeColor, themeConfig, announcementSection, headerSection, footerSection, bodySections, isDraftPreview }
}

/** Backwards-compatible alias used by the home storefront. */
export function useEffectiveShopConfig(shop: Shop | null | undefined) {
  return useEffectiveConfig(shop, 'home')
}

/** Sections a template should render with (incl. header/footer for the home
 *  page which owns them). */
export function useEffectiveTemplateConfig(
  shop: Shop | null | undefined,
  templateKey: SystemTemplateKey,
) {
  return useEffectiveConfig(shop, templateKey)
}