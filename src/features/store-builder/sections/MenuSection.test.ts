import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MenuRenderer } from './MenuSection'
import { DEFAULT_THEME_CONFIG } from '@/config/themeTokens'
import type { ProductWithRelations, Shop } from '@/types'
import type { MenuSectionConfig } from '@/types/builder'

const shop = { id: 'shop-1', currency: 'XOF' } as Shop
const config: MenuSectionConfig = { heading: 'Notre carte', showPrices: true, limit: 24 }

const category = (id: string, name: string) => ({ id, name }) as ProductWithRelations['category']
const dish = (id: string, name: string, cat: ProductWithRelations['category'], price = 2500): ProductWithRelations =>
  ({ id, name, slug: id, price, stock: 5, description: null, category: cat, images: [], variants: [] }) as unknown as ProductWithRelations

function render(products: ProductWithRelations[], editable = false) {
  const client = new QueryClient()
  client.setQueryData(['products', 'active', { shopId: 'shop-1', sort: 'recent', page: 1, pageSize: 24 }], {
    products,
    total: products.length,
  })
  client.setQueryData(['categories', 'shop-1', 'product'], [
    { id: 'plats', name: 'Plats' },
    { id: 'desserts', name: 'Desserts' },
  ])
  const menu = createElement(MenuRenderer, { shop, config, themeConfig: DEFAULT_THEME_CONFIG, editable })
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, menu)),
  )
}

describe('MenuRenderer', () => {
  it('groupe les plats par catégorie dans l’ordre du commerçant, sans catégorie en dernier', () => {
    const html = render([
      dish('a', 'Thiéboudienne', category('plats', 'Plats')),
      dish('b', 'Thiakry', category('desserts', 'Desserts')),
      dish('c', 'Bissap', null),
    ])
    expect(html.indexOf('Plats')).toBeLessThan(html.indexOf('Desserts'))
    expect(html.indexOf('Desserts')).toBeLessThan(html.indexOf('Bissap'))
    expect(html).toContain('href="/produits/a"')
  })

  it('n’affiche rien au visiteur quand la carte est vide', () => {
    expect(render([])).toBe('')
  })

  it('guide le commerçant dans l’éditeur quand la carte est vide', () => {
    expect(render([], true)).toContain('Votre carte est vide')
  })
})
