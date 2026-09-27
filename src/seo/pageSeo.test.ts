import { describe, expect, it } from 'vitest'
import { scorePageSeo } from './pageSeo'

describe('scorePageSeo', () => {
  it('valide une page complète', () => {
    const { checks, done } = scorePageSeo({
      title: 'À propos',
      seoTitle: 'Notre histoire — Boutique Exemple',
      seoDescription: 'Depuis 2020, nous habillons Dakar avec des tissus wax cousus main.',
      ogImage: 'https://example.com/partage.jpg',
    })
    expect(done).toBe(3)
    expect(checks.every((c) => c.ok)).toBe(true)
  })

  it('replie sur le titre de la page quand le titre SEO est vide', () => {
    const { checks } = scorePageSeo({ title: 'Questions fréquentes', seoTitle: null, seoDescription: null, ogImage: null })
    expect(checks.find((c) => c.key === 'title')?.ok).toBe(true)
    expect(checks.find((c) => c.key === 'description')?.ok).toBe(false)
    expect(checks.find((c) => c.key === 'image')?.ok).toBe(false)
  })

  it('signale une page vide', () => {
    const { done } = scorePageSeo({ title: '', seoTitle: '', seoDescription: '', ogImage: null })
    expect(done).toBe(0)
  })
})
