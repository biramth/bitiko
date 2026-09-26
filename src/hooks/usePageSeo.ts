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

/** Image de partage par défaut du document (celle d'index.html), capturée au chargement : les pages de la
 *  plateforme sans image propre la retrouvent au lieu de la perdre après avoir quitté une page qui en avait une. */
const DEFAULT_OG_IMAGE =
  typeof document !== 'undefined'
    ? (document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.getAttribute('content') ?? null)
    : null

function removeMetaTag(attr: 'name' | 'property', key: string) {
  document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)?.remove()
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
 * page — call once from the storefront layout and restore the defaults on
 * unmount. Swaps EVERY icon link (the page declares ico + svg + png plus an
 * apple-touch-icon, and browsers pick freely among them — swapping only the
 * first left Chrome on the SVG, i.e. still our logo).
 */
const DEFAULT_ICON_HREFS = new Map<HTMLLinkElement, string>()
if (typeof document !== 'undefined') {
  document.head
    .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
    .forEach((link) => DEFAULT_ICON_HREFS.set(link, link.getAttribute('href') ?? ''))
}

function iconLinks(): HTMLLinkElement[] {
  const links = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]'),
  )
  if (links.length === 0) {
    const link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
    DEFAULT_ICON_HREFS.set(link, '')
    return [link]
  }
  return links
}

export function useShopFavicon(logoUrl: string | null | undefined) {
  useEffect(() => {
    const links = iconLinks()
    links.forEach((link) => {
      link.href = logoUrl || DEFAULT_ICON_HREFS.get(link) || ''
    })

    return () => {
      links.forEach((link) => {
        link.href = DEFAULT_ICON_HREFS.get(link) || ''
      })
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
    // Draft previews (?preview=draft) share live URLs — never index them.
    const isDraftPreview = new URLSearchParams(window.location.search).has('preview')

    setCanonical(canonical)
    setMetaTag('property', 'og:url', canonical)
    setMetaTag('property', 'og:site_name', siteName || 'Bitiko')
    setMetaTag('property', 'og:type', 'website')
    setMetaTag('property', 'og:locale', 'fr_FR')

    if (description) {
      setMetaTag('name', 'description', description)
      setMetaTag('property', 'og:description', description)
      setMetaTag('name', 'twitter:description', description)
    }
    setMetaTag('property', 'og:title', title)
    setMetaTag('name', 'twitter:title', title)
    setMetaTag('name', 'twitter:card', image || (!siteName && DEFAULT_OG_IMAGE) ? 'summary_large_image' : 'summary')
    if (image) {
      setMetaTag('property', 'og:image', image)
      setMetaTag('name', 'twitter:image', image)
    } else {
      // Sans ça, l'og:image de la page précédente survivait à la navigation
      // SPA (ex. fiche produit → catalogue gardait la photo du produit dans
      // les aperçus et les signaux sociaux).
      if (!siteName && DEFAULT_OG_IMAGE) {
        setMetaTag('property', 'og:image', DEFAULT_OG_IMAGE)
        setMetaTag('name', 'twitter:image', DEFAULT_OG_IMAGE)
      } else {
        removeMetaTag('property', 'og:image')
        removeMetaTag('name', 'twitter:image')
      }
    }
    setMetaTag('name', 'robots', noindex || isDraftPreview ? 'noindex, nofollow' : 'index, follow')

    return () => {
      document.title = previousTitle
    }
  }, [title, description, image, noindex, canonicalUrl, siteName])
}
