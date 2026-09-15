import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Maximize2, Monitor, ShieldClose, Smartphone, Tablet, X } from 'lucide-react'
import { storefrontUrl } from '@/lib/tenant'
import {
  isPreviewNavMessage,
  isPreviewReadyMessage,
  isPreviewSelectMessage,
  PREVIEW_UPDATE,
} from './previewBridge'
import type { LayoutSection, SystemTemplateKey, ThemeConfig } from '@/types/builder'

type Breakpoint = 'desktop' | 'tablet' | 'mobile'

const FRAME_WIDTH: Record<Breakpoint, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

function withPreviewParam(url: string): string {
  return url.includes('?') ? `${url}&preview=draft` : `${url}?preview=draft`
}

function BreakpointSwitcher({ value, onChange }: { value: Breakpoint; onChange: (v: Breakpoint) => void }) {
  return (
    <div className="flex items-center gap-1">
      {([
        { key: 'desktop', icon: Monitor, label: 'Ordinateur' },
        { key: 'tablet', icon: Tablet, label: 'Tablette' },
        { key: 'mobile', icon: Smartphone, label: 'Mobile' },
      ] as const).map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={label}
          title={label}
          className={`rounded-lg p-2 ${value === key ? 'bg-brand-50 text-brand-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
        >
          <Icon size={16} aria-hidden />
        </button>
      ))}
    </div>
  )
}

export function BuilderPreviewFrame({
  slug,
  pagePath = '/',
  templateKey,
  sections,
  themeColor,
  themeConfig,
  onSelectSection,
  onNavigate,
}: {
  slug: string
  pagePath?: string
  /** System template id these sections belong to; 'home' or absent = home page. */
  templateKey?: 'home' | SystemTemplateKey
  sections: LayoutSection[]
  themeColor: string
  themeConfig: ThemeConfig
  onSelectSection: (id: string) => void
  /** Fired when the preview iframe navigates internally (product click, …)
   *  so the editor can switch to the matching template. */
  onNavigate?: (path: string) => void
}) {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')
  const [immersive, setImmersive] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const src = withPreviewParam(storefrontUrl(slug, pagePath))
  const targetOrigin = typeof window !== 'undefined' ? new URL(src, window.location.origin).origin : '*'

  const sendUpdate = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_UPDATE, sections, themeColor, themeConfig, templateKey: templateKey ?? 'home' },
      targetOrigin,
    )
  }

  // Resend on every edit, and once more when the iframe signals it's ready
  // (its own listener may not be attached yet the instant it loads).
  useEffect(() => {
    sendUpdate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, themeColor, themeConfig])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== targetOrigin) return
      if (isPreviewReadyMessage(event.data)) sendUpdate()
      else if (isPreviewSelectMessage(event.data)) onSelectSection(event.data.sectionId)
      else if (isPreviewNavMessage(event.data)) onNavigate?.(event.data.path)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetOrigin, sections, themeColor, themeConfig, templateKey, onSelectSection, onNavigate])

  // Escape or "click outside" closes the immersive preview.
  useEffect(() => {
    if (!immersive) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImmersive(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [immersive])

  const openInNewTab = () => {
    window.open(src, '_blank', 'noopener')
  }

  return (
    <>
      {/* ── Embedded preview ─────────────────────────────────── */}
      <div className="flex h-full flex-col bg-gray-100">
        <div className="flex items-center justify-between gap-1 border-b border-gray-200 bg-white py-2 pl-2 pr-1.5">
          <BreakpointSwitcher value={breakpoint} onChange={setBreakpoint} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openInNewTab}
              title="Ouvrir dans un nouvel onglet"
              aria-label="Ouvrir dans un nouvel onglet"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <ExternalLink size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setImmersive(true)}
              title="Plein écran"
              aria-label="Plein écran"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <Maximize2 size={16} aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-start justify-center overflow-auto p-4">
          <iframe
            ref={iframeRef}
            src={src}
            title="Aperçu de la boutique"
            onLoad={sendUpdate}
            style={{ width: FRAME_WIDTH[breakpoint], maxWidth: '100%' }}
            className="h-full min-h-[700px] rounded-lg border border-gray-300 bg-white shadow-sm transition-[width] duration-200"
          />
        </div>
      </div>

      {/* ── Immersive (Shopify-style) full-screen preview ─────── */}
      {immersive && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu plein écran de la boutique"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-gray-900 px-3 py-2 text-white">
            <div className="flex items-center gap-3">
              <p className="hidden text-xs font-medium text-white/70 sm:block">
                Aperçu — {pagePath === '/' ? 'Accueil' : pagePath}
              </p>
              <BreakpointSwitcher value={breakpoint} onChange={setBreakpoint} />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={openInNewTab}
                title="Ouvrir dans un nouvel onglet"
                aria-label="Ouvrir dans un nouvel onglet"
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <ExternalLink size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setImmersive(false)}
                title="Fermer (Échap)"
                aria-label="Fermer l'aperçu plein écran"
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                <ShieldClose size={15} aria-hidden />
                <span className="hidden sm:inline">Fermer</span>
                <X size={15} aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-start justify-center overflow-auto p-6 sm:p-10">
            <iframe
              ref={iframeRef}
              src={src}
              title="Aperçu de la boutique"
              onLoad={sendUpdate}
              style={{ width: FRAME_WIDTH[breakpoint], maxWidth: '100%' }}
              className="min-h-[600px] rounded-xl border border-white/20 bg-white shadow-2xl transition-[width] duration-200"
            />
          </div>
        </div>
      )}
    </>
  )
}