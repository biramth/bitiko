import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FeaturedProductsRenderer } from './FeaturedProductsSection'
import { DEFAULT_THEME_CONFIG } from '@/config/themeTokens'
import type { ProductWithRelations, Shop } from '@/types'

vi.mock('@/features/cart/CartContext', () => ({ useCart: () => ({ addItem: () => {}, itemCount: 0 }) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success: () => {}, error: () => {} }) }))

const shop = { id: 'shop-1', currency: 'XOF', low_stock_threshold: 3 } as Shop
const product = (id: string, name: string) =>
  ({ id, name, slug: id, price: 5000, stock: 5, badge: null, category: null, images: [], variants: [] }) as unknown as ProductWithRelations

function render(productIds: string[], cached: ProductWithRelations[]) {
  const client = new QueryClient()
  client.setQueryData(['products', 'featured', 'shop-1', productIds], cached)
  const section = createElement(FeaturedProductsRenderer, {
    shop,
    config: { heading: 'Nos best-sellers', productIds },
    themeConfig: DEFAULT_THEME_CONFIG,
  })
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, null, section),
    ),
  )
}

describe('FeaturedProductsRenderer', () => {
  it('affiche la sélection même quand le commerçant n’a rien choisi (les plus récents)', () => {
    const html = render([], [product('a', 'Sérum éclat')])
    expect(html).toContain('Nos best-sellers')
    expect(html).toContain('Sérum éclat')
  })

  it('n’affiche rien tant qu’il n’y a aucun produit', () => {
    expect(render([], [])).toBe('')
  })
})
