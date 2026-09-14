import { useEffect } from 'react'
import type { ProductWithRelations } from '@/types'

const SCRIPT_ID = 'product-structured-data'

/** Injects Product JSON-LD for the current page — helps Google understand
 * product pages for search (does not affect link-preview bots, which don't
 * execute JS). No-op while the product hasn't loaded yet. */
export function useProductStructuredData(product: ProductWithRelations | null, currency: string) {
  useEffect(() => {
    if (!product) return

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = SCRIPT_ID
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description ?? undefined,
      image: product.images.map((i) => i.public_url),
      category: product.category?.name,
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: currency,
        availability:
          product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById(SCRIPT_ID)?.remove()
    }
  }, [product, currency])
}
