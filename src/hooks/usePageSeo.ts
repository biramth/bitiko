import { useEffect } from 'react'

interface PageSeoOptions {
  title: string
  description?: string
  image?: string | null
  /** For pages that must never be indexed (404s, admin, cart, checkout). */
  noindex?: boolean
  /** Absolute canonical URL. Defaults to the current origin + pathname, so
   * each shop subdomain keeps its own canonical. */
  canonicalUrl?: string
  /** og:site_name — the shop's own name on a storefront page, left as
   * "Bitiko" (the default) on the platform's own pages. A shared shop link
   * should read as that shop's own site in the preview card, not the SaaS's. */
  siteName?: string
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
}

/**
 * Swaps the tab favicon to a shop's own logo. Not part of usePageSeo's
 * per-page effect since a favicon belongs to the whole shop, not a single
 * page — call once from the storefront layout and restore the default
 * (index.html's own <link rel="icon">, set once on module load) on unmount.
 */
const DEFAULT_FAVICON = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href ?? null

export function useShopFavicon(logoUrl: string | null | undefined) {
  useEffect(() => {
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = logoUrl || DEFAULT_FAVICON || ''

    return () => {
      if (link && DEFAULT_FAVICON) link.href = DEFAULT_FAVICON
    }
  }, [logoUrl])
}

/**
 * Sets the document title and description/OG meta tags for the current
 * page. Note: this only affects the client-rendered DOM — non-JS link-preview
 * bots (WhatsApp, Facebook, Twitter…) never see this; they're served
 * per-shop tags server-side instead (see middleware.ts + api/og.ts). This
 * hook covers the browser tab, bookmarks, and search engines that do render
 * JS (Googlebot).
 */
export function usePageSeo({ title, description, image, noindex, canonicalUrl, siteName }: PageSeoOptions) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title

    const { origin, pathname } = window.location
    const canonical = canonicalUrl || (origin + pathname)

    setCanonical(canonical)
    setMetaTag('property', 'og:url', canonical)
    setMetaTag('property', 'og:site_name', siteName || 'Bitiko')

    if (description) {
      setMetaTag('name', 'description', description)
      setMetaTag('property', 'og:description', description)
    }
    setMetaTag('property', 'og:title', title)
    if (image) setMetaTag('property', 'og:image', image)
    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    return () => {
      document.title = previousTitle
    }
  }, [title, description, image, noindex, canonicalUrl, siteName])
}
