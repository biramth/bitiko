import { useEffect, useRef, useState } from 'react'
import { Monitor, Smartphone, Tablet } from 'lucide-react'
import { shopUrl } from '@/lib/tenant'
import { isPreviewReadyMessage, PREVIEW_UPDATE } from './previewBridge'
import type { LayoutSection, ThemeConfig } from '@/types/builder'

type Breakpoint = 'desktop' | 'tablet' | 'mobile'

const FRAME_WIDTH: Record<Breakpoint, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

function withPreviewParam(url: string): string {
  return url.includes('?') ? `${url}&preview=draft` : `${url}?preview=draft`
}

export function BuilderPreviewFrame({
  slug,
  sections,
  themeColor,
  themeConfig,
}: {
  slug: string
  sections: LayoutSection[]
  themeColor: string
  themeConfig: ThemeConfig
}) {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const src = withPreviewParam(shopUrl(slug))
  const targetOrigin = typeof window !== 'undefined' ? new URL(src, window.location.origin).origin : '*'

  const sendUpdate = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_UPDATE, sections, themeColor, themeConfig },
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
      if (event.origin === targetOrigin && isPreviewReadyMessage(event.data)) sendUpdate()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetOrigin, sections, themeColor, themeConfig])

  return (
    <div className="flex h-full flex-col bg-gray-100">
      <div className="flex items-center justify-center gap-1 border-b border-gray-200 bg-white py-2">
        {([
          { key: 'desktop', icon: Monitor, label: 'Ordinateur' },
          { key: 'tablet', icon: Tablet, label: 'Tablette' },
          { key: 'mobile', icon: Smartphone, label: 'Mobile' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setBreakpoint(key)}
            aria-label={label}
            title={label}
            className={`rounded-lg p-2 ${breakpoint === key ? 'bg-brand-50 text-brand-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
          >
            <Icon size={16} aria-hidden />
          </button>
        ))}
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
  )
}
