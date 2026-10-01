import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GUIDED_TOURS, GUIDED_TOUR_BY_ID } from './tours'
import { answersForHelp, matchesQuery, stepsFor, supportLink, toursForHelp, visibleShortcuts } from './help'
import { isTourSeen, markTourDone, markTourSeen, tourStatus } from './storage'

const SALON = new Set(['HAS_SERVICES', 'HAS_APPOINTMENTS', 'HAS_SHOP'])
const COMMERCE = new Set(['HAS_ORDERS', 'HAS_PRODUCTS', 'HAS_CUSTOMERS', 'HAS_SHOP', 'HAS_DELIVERY'])

describe('toursForHelp', () => {
  const ids = (caps: Set<string> | null, path = '/admin', role?: 'owner' | 'vendeur') =>
    toursForHelp(GUIDED_TOURS, caps, path, role).map((e) => e.tour.id)

  it('masque les visites d’un autre métier', () => {
    expect(ids(SALON)).not.toContain('orders')
    expect(ids(COMMERCE)).not.toContain('services')
    expect(ids(COMMERCE)).not.toContain('appointments')
  })

  it('propose tout quand les capacités sont inconnues', () => {
    expect(ids(null)).toEqual(
      expect.arrayContaining(['welcome', 'products', 'orders', 'appointments', 'services', 'finance', 'tontines', 'notes', 'customize']),
    )
  })

  it('masque au vendeur les visites de pages qu’il ne peut pas ouvrir', () => {
    const list = ids(null, '/admin', 'vendeur')
    expect(list).toEqual(expect.arrayContaining(['orders', 'appointments']))
    for (const hidden of ['customize', 'products', 'finance', 'tontines', 'notes']) expect(list).not.toContain(hidden)
  })

  it('place la visite de la page courante en premier, y compris sur une sous-page', () => {
    const list = toursForHelp(GUIDED_TOURS, null, '/admin/tontines/abc')
    expect(list[0]).toMatchObject({ tour: { id: 'tontines' }, onPage: true })
    expect(list.slice(1).every((e) => !e.onPage)).toBe(true)
  })

  it('filtre par recherche, sans tenir compte des accents', () => {
    expect(toursForHelp(GUIDED_TOURS, null, '/admin', 'owner', 'epargne').map((e) => e.tour.id)).toEqual(['tontines'])
  })
})

describe('stepsFor', () => {
  const titles = (caps: Set<string> | null, role: 'owner' | 'vendeur') => stepsFor(GUIDED_TOUR_BY_ID.welcome, caps, role).map((s) => s.title)

  it('ne montre au vendeur que les menus qu’il voit', () => {
    const steps = titles(COMMERCE, 'vendeur')
    expect(steps).toContain('Commandes')
    for (const hidden of ['Gestion', 'Paramètres', 'Personnaliser']) expect(steps).not.toContain(hidden)
  })

  it('adapte la visite d’accueil au métier', () => {
    expect(titles(SALON, 'owner')).toEqual(expect.arrayContaining(['Rendez-vous', 'Prestations', 'Gestion']))
    expect(titles(SALON, 'owner')).not.toContain('Commandes')
  })
})

describe('answersForHelp', () => {
  it('met en avant les questions de la page courante', () => {
    const keys = answersForHelp(null, '/admin/tontines', 'owner').map((e) => e.answer.key)
    expect(keys).toEqual(['tontine-income', 'tontine-mistake'])
  })

  it('retombe sur les questions générales ailleurs', () => {
    const keys = answersForHelp(null, '/admin/clients', 'owner').map((e) => e.answer.key)
    expect(keys).toEqual(expect.arrayContaining(['share', 'team']))
  })

  it('cherche dans toutes les questions autorisées', () => {
    const keys = answersForHelp(null, '/admin', 'owner', 'comptable').map((e) => e.answer.key)
    expect(keys).toEqual(['accountant'])
    expect(answersForHelp(null, '/admin', 'vendeur', 'bénéfice')).toHaveLength(0)
  })

  it('respecte le métier', () => {
    expect(answersForHelp(SALON, '/admin/commandes', 'owner', 'commande').map((e) => e.answer.key)).not.toContain('phone-order')
  })
})

describe('visibleShortcuts', () => {
  const keys = (caps: Set<string> | null, role: 'owner' | 'vendeur', query = '') => visibleShortcuts(caps, role, query).map((s) => s.key)

  it('adapte les raccourcis au métier', () => {
    expect(keys(SALON, 'owner')).toContain('hours')
    expect(keys(SALON, 'owner')).not.toContain('delivery')
    expect(keys(COMMERCE, 'owner')).toEqual(expect.arrayContaining(['delivery', 'order']))
  })

  it('ne propose pas les réglages ni les chiffres à un vendeur', () => {
    const list = keys(null, 'vendeur')
    expect(list).toContain('share')
    for (const hidden of ['logo', 'plan', 'expense', 'note']) expect(list).not.toContain(hidden)
  })

  it('filtre par recherche', () => {
    expect(keys(null, 'owner', 'depense')).toEqual(['expense'])
  })
})

describe('matchesQuery', () => {
  it('exige chaque mot, sans accents ni casse', () => {
    expect(matchesQuery('Régler la livraison', 'LIVRAISON regler')).toBe(true)
    expect(matchesQuery('Régler la livraison', 'livraison stock')).toBe(false)
    expect(matchesQuery('Peu importe', '  ')).toBe(true)
  })
})

describe('repères des visites', () => {
  const SRC = path.resolve(import.meta.dirname, '../..')
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name)
      return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [full] : []
    })
  const source = files(SRC).map((f) => readFileSync(f, 'utf8')).join('\n')
  const anchors = new Set([...source.matchAll(/data-guide="([a-z-]+)"/g), ...source.matchAll(/guide: '([a-z-]+)'/g)].map((m) => m[1]))

  it('pointe uniquement vers des éléments qui existent dans l’interface', () => {
    const missing = GUIDED_TOURS.flatMap((tour) =>
      tour.steps.flatMap((step) => {
        const id = step.target?.match(/data-guide="([a-z-]+)"/)?.[1]
        return id && !anchors.has(id) ? [`${tour.id} → ${id}`] : []
      }),
    )
    expect(missing).toEqual([])
  })
})

describe('suivi des visites', () => {
  let store: Record<string, string>
  beforeEach(() => {
    store = {}
    ;(globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v
        },
      },
    }
  })
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  it('passe de nouvelle à vue puis terminée, sans revenir en arrière', () => {
    expect(tourStatus('orders')).toBe('new')
    markTourSeen('orders')
    expect(tourStatus('orders')).toBe('seen')
    markTourDone('orders')
    markTourSeen('orders')
    expect(tourStatus('orders')).toBe('done')
    expect(isTourSeen('orders')).toBe(true)
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
