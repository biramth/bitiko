import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEFAULT_THEME_CONFIG } from '@/config/themeTokens'
import { buildDefaultSections } from '@/config/defaultLayout'
import { isPreviewUpdateMessage, PREVIEW_READY, type PreviewUpdateMessage } from './previewBridge'
import type { Shop } from '@/types'
import type { LayoutSection } from '@/types/builder'

/**
 * Resolves which theme/layout a shop should render with: the published
 * columns normally, or — when loaded with `?preview=draft` inside the
 * builder's live-preview iframe — whatever the parent editor last posted via
 * `previewBridge`, so every keystroke shows up instantly with no DB write.
 * Falls back to the shop's saved `builder_draft` for the "Preview" button
 * opened as a plain tab, where there is no parent window to sync with.
 */
export function useEffectiveShopConfig(shop: Shop | null | undefined) {
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

  const draft = liveUpdate ?? (isDraftPreview ? shop?.builder_draft : null)

  const sections: LayoutSection[] = draft?.sections ?? shop?.layout_sections ?? buildDefaultSections()
  const themeColor: string = draft?.themeColor ?? shop?.theme_color ?? '#d9612e'
  const themeConfig = draft?.themeConfig ?? shop?.theme_config ?? DEFAULT_THEME_CONFIG

  const headerSection = sections.find((s) => s.type === 'header' && s.visible)
  const footerSection = sections.find((s) => s.type === 'footer' && s.visible)
  const bodySections = sections.filter((s) => s.type !== 'header' && s.type !== 'footer' && s.visible)

  return { sections, themeColor, themeConfig, headerSection, footerSection, bodySections, isDraftPreview }
}
