import { useEffect } from 'react'

const SCRIPT_ID = 'breadcrumb-structured-data'

export interface BreadcrumbCrumb {
  name: string
  path: string
}

/** Injects BreadcrumbList JSON-LD for the current page, mirroring
 * useProductStructuredData — helps Google show the breadcrumb trail in
 * search results for product/category pages. No-op until crumbs resolve. */
export function useBreadcrumbStructuredData(crumbs: BreadcrumbCrumb[] | null) {
  useEffect(() => {
    if (!crumbs || crumbs.length === 0) return

    const { origin } = window.location
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = SCRIPT_ID
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: origin + crumb.path,
      })),
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById(SCRIPT_ID)?.remove()
    }
  }, [crumbs])
}
