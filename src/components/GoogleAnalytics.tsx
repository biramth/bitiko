import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args)
  }
}

/**
 * Google Analytics 4 (gtag.js) for platform + storefront pages.
 * No-op unless VITE_GA_MEASUREMENT_ID is set — never loads anything without it.
 */
export function GoogleAnalytics() {
  const location = useLocation()

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return

    window.dataLayer = window.dataLayer || []
    window.gtag = function (...gtagArgs: unknown[]) {
      window.dataLayer!.push(gtagArgs)
    }
    gtag('js', new Date())
    gtag('config', GA_MEASUREMENT_ID)

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
      delete window.gtag
    }
  }, [])

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return
    gtag('event', 'page_view', { page_path: location.pathname + location.search })
  }, [location.pathname, location.search])

  return null
}