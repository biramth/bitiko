import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void; 'error-callback'?: () => void },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
    }
    __turnstileScriptLoading?: Promise<void>
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (window.__turnstileScriptLoading) return window.__turnstileScriptLoading
  window.__turnstileScriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(script)
  })
  return window.__turnstileScriptLoading
}

/**
 * Bot-friction widget for api/check-email — renders nothing (and calls
 * onVerify with null) when VITE_TURNSTILE_SITE_KEY isn't set, so the app
 * behaves the same with or without Turnstile configured. "Managed" mode
 * (Cloudflare's default): usually invisible, only challenges requests it
 * deems suspicious.
 */
export function Turnstile({ onVerify }: { onVerify: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

  useEffect(() => {
    if (!siteKey || !containerRef.current) return
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onVerify(token),
          'expired-callback': () => onVerify(null),
          'error-callback': () => onVerify(null),
        })
      })
      .catch(() => onVerify(null))

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (!siteKey) return null
  return <div ref={containerRef} className="flex justify-center" />
}
