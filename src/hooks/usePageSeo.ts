import { useEffect } from 'react'

interface PageSeoOptions {
  title: string
  description?: string
  image?: string | null
  /** For pages that must never be indexed (404s, admin, cart, checkout). */
  noindex?: boolean
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

/**
 * Sets the document title and description/OG meta tags for the current
 * page. Note: this only affects the client-rendered DOM — crawlers that
 * don't execute JS (most link-preview bots, e.g. WhatsApp/Facebook) will
 * still see the static tags from index.html. It does help the browser tab,
 * bookmarks, and search engines that do render JS (Googlebot).
 */
export function usePageSeo({ title, description, image, noindex }: PageSeoOptions) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title

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
  }, [title, description, image, noindex])
}
