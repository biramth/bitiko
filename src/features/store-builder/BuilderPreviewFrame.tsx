import { useCallback, useEffect, useRef, useState } from 'react'
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

/** True viewport width simulated per breakpoint — the iframe always renders at
 *  this exact width (never squeezed into whatever panel space is left), then
 *  the whole thing is scaled down visually to fit. This is what makes
 *  "Desktop" actually look like a desktop site instead of silently falling
 *  back to the storefront's own mobile CSS breakpoint (< md, 768px) just
 *  because the builder's preview column happens to be narrower than that. */
const FRAME_WIDTH: Record<Breakpoint, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
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

/** Renders the iframe at its real breakpoint width and full content height,
 *  then scales the whole thing down (CSS transform) to fit whatever space
 *  the surrounding panel actually has. Clicks/scroll inside the iframe keep
 *  working normally — the browser maps them through the transform. */
function ScaledPreview({
  breakpoint,
  src,
  iframeRef,
  onLoad,
  rounded,
}: {
  breakpoint: Breakpoint
  src: string
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  onLoad: () => void
  rounded: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [contentHeight, setContentHeight] = useState(900)

  const measure = useCallback(() => {
    if (containerRef.current) setContainerWidth(containerRef.current.getBoundingClientRect().width)
    const doc = iframeRef.current?.contentDocument
    const h = doc?.documentElement?.scrollHeight
    if (h && h > 0) setContentHeight((prev) => (Math.abs(prev - h) > 4 ? h : prev))
  }, [iframeRef])

  // Poll instead of ResizeObserver: cheap (one bounding-rect read), and it
  // also picks up the iframe's own content growing/shrinking as sections or
  // theme change, which ResizeObserver on the container alone wouldn't catch.
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    const id = window.setInterval(measure, 400)
    return () => {
      window.removeEventListener('resize', measure)
      window.clearInterval(id)
    }
  }, [measure, breakpoint])

  const frameWidth = FRAME_WIDTH[breakpoint]
  const scale = containerWidth > 0 ? Math.min(1, containerWidth / frameWidth) : 1

  return (
    <div ref={containerRef} className="w-full min-w-0" style={{ maxWidth: frameWidth }}>
      <div
        className={`overflow-hidden ${rounded}`}
        style={{ width: frameWidth * scale, height: contentHeight * scale }}
      >
        <div style={{ width: frameWidth, height: contentHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <iframe
            ref={iframeRef}
            src={src}
            title="Aperçu de la boutique"
            onLoad={() => {
              onLoad()
              measure()
            }}
            style={{ width: frameWidth, height: contentHeight }}
            className="border border-gray-300 bg-white"
          />
        </div>
      </div>
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

  // Escape closes the immersive preview.
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

  // One shared iframe for both modes — toggling fullscreen just changes the
  // wrapper's layout/styling, it never remounts (or reloads) the preview.
  return (
    <div
      className={
        immersive
          ? 'fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm'
          : 'flex h-full flex-col bg-gray-100'
      }
      role={immersive ? 'dialog' : undefined}
      aria-modal={immersive || undefined}
      aria-label={immersive ? 'Aperçu plein écran de la boutique' : undefined}
    >
      <div
        className={
          immersive
            ? 'flex items-center justify-between border-b border-white/10 bg-gray-900 px-3 py-2 text-white'
            : 'flex items-center justify-between gap-1 border-b border-gray-200 bg-white py-2 pl-2 pr-1.5'
        }
      >
        <div className="flex items-center gap-3">
          {immersive && (
            <p className="hidden text-xs font-medium text-white/70 sm:block">
              Aperçu — {pagePath === '/' ? 'Accueil' : pagePath}
            </p>
          )}
          <BreakpointSwitcher value={breakpoint} onChange={setBreakpoint} />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openInNewTab}
            title="Ouvrir dans un nouvel onglet"
            aria-label="Ouvrir dans un nouvel onglet"
            className={
              immersive
                ? 'rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white'
                : 'rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }
          >
            <ExternalLink size={16} aria-hidden />
          </button>
          {immersive ? (
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
          ) : (
            <button
              type="button"
              onClick={() => setImmersive(true)}
              title="Plein écran"
              aria-label="Plein écran"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <Maximize2 size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div className={immersive ? 'flex flex-1 items-start justify-center overflow-auto p-6 sm:p-10' : 'flex flex-1 items-start justify-center overflow-auto p-4'}>
        <ScaledPreview
          breakpoint={breakpoint}
          src={src}
          iframeRef={iframeRef}
          onLoad={sendUpdate}
          rounded={immersive ? 'rounded-xl shadow-2xl' : 'rounded-lg shadow-sm'}
        />
      </div>
    </div>
  )
}
