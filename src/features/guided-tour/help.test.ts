import { describe, expect, it } from 'vitest'
import { GUIDED_TOURS } from './tours'
import { supportLink, toursForHelp, visibleShortcuts } from './help'

describe('toursForHelp', () => {
  const ids = (caps: Set<string> | null, path = '/admin') => toursForHelp(GUIDED_TOURS, caps, path).map((e) => e.tour.id)

  it('masque les visites d’un autre métier', () => {
    expect(ids(new Set(['HAS_SERVICES', 'HAS_APPOINTMENTS']))).not.toContain('orders')
    expect(ids(new Set(['HAS_ORDERS', 'HAS_PRODUCTS']))).not.toContain('services')
  })

  it('propose tout quand les capacités sont inconnues', () => {
    expect(ids(null)).toEqual(expect.arrayContaining(['welcome', 'products', 'orders', 'services', 'customize']))
  })

  it('masque au vendeur les visites de pages qu’il ne peut pas ouvrir', () => {
    const list = toursForHelp(GUIDED_TOURS, null, '/admin', 'vendeur').map((e) => e.tour.id)
    expect(list).toContain('orders')
    expect(list).not.toContain('customize')
    expect(list).not.toContain('products')
  })

  it('place la visite de la page courante en premier', () => {
    const list = toursForHelp(GUIDED_TOURS, null, '/admin/commandes')
    expect(list[0]?.tour.id).toBe('orders')
    expect(list[0]?.onPage).toBe(true)
    expect(list.slice(1).every((e) => !e.onPage)).toBe(true)
  })
})

describe('visibleShortcuts', () => {
  const labels = (caps: Set<string> | null, role: 'owner' | 'vendeur') => visibleShortcuts(caps, role).map((s) => s.key)

  it('adapte les raccourcis au métier', () => {
    expect(labels(new Set(['HAS_SERVICES', 'HAS_APPOINTMENTS']), 'owner')).toContain('hours')
    expect(labels(new Set(['HAS_SERVICES', 'HAS_APPOINTMENTS']), 'owner')).not.toContain('delivery')
    expect(labels(new Set(['HAS_ORDERS', 'HAS_DELIVERY']), 'owner')).toContain('delivery')
  })

  it('ne propose pas les réglages à un vendeur', () => {
    const keys = labels(null, 'vendeur')
    expect(keys).toContain('share')
    expect(keys).not.toContain('logo')
    expect(keys).not.toContain('plan')
  })
})

describe('supportLink', () => {
  it('construit le lien WhatsApp avec le nom de la boutique', () => {
    const link = supportLink('+221 77 123 45 67', 'Chez Awa')!
    expect(link.startsWith('https://wa.me/221771234567?text=')).toBe(true)
    expect(decodeURIComponent(link)).toContain('Chez Awa')
  })

  it('reste absent tant que le numéro n’est pas configuré', () => {
    expect(supportLink(undefined)).toBeNull()
    expect(supportLink('')).toBeNull()
  })
})
