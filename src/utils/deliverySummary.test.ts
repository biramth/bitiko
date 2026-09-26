import { describe, expect, it } from 'vitest'
import { describeDelivery, summarizeDelivery } from './deliverySummary'

const money = (n: number) => `${n} F`
const secteur = (id: string, fee: number, is_active = true) => ({ id, fee, is_active })
const ville = (secteur_id: string, is_active = true) => ({ secteur_id, is_active })

describe('summarizeDelivery', () => {
  it('sans zone desservie : livraison à convenir', () => {
    expect(summarizeDelivery([], [], null)).toEqual({ kind: 'arranged' })
    expect(summarizeDelivery([secteur('a', 500)], [], null)).toEqual({ kind: 'arranged' })
    expect(summarizeDelivery([secteur('a', 500, false)], [ville('a')], null)).toEqual({ kind: 'arranged' })
    expect(summarizeDelivery([secteur('a', 500)], [ville('a', false)], null)).toEqual({ kind: 'arranged' })
  })

  it('résume les tarifs des seuls secteurs desservis', () => {
    const summary = summarizeDelivery(
      [secteur('a', 1000), secteur('b', 2500), secteur('c', 9000, false)],
      [ville('a'), ville('b'), ville('c')],
      10000,
    )
    expect(summary).toEqual({ kind: 'zones', minFee: 1000, maxFee: 2500, freeAbove: 10000 })
  })

  it('ignore un seuil de gratuité nul', () => {
    expect(summarizeDelivery([secteur('a', 1000)], [ville('a')], 0)).toMatchObject({ freeAbove: null })
  })
})

describe('describeDelivery', () => {
  it('à convenir', () => {
    expect(describeDelivery({ kind: 'arranged' }, money)).toBe('Livraison ou retrait à convenir avec le vendeur')
  })

  it('tarif unique, fourchette, gratuit, et seuil de gratuité', () => {
    expect(describeDelivery({ kind: 'zones', minFee: 0, maxFee: 0, freeAbove: null }, money)).toBe('Livraison gratuite')
    expect(describeDelivery({ kind: 'zones', minFee: 1000, maxFee: 1000, freeAbove: null }, money)).toBe('Livraison 1000 F')
    expect(describeDelivery({ kind: 'zones', minFee: 1000, maxFee: 2500, freeAbove: 15000 }, money)).toBe(
      'Livraison dès 1000 F selon votre ville, offerte dès 15000 F d’achat',
    )
  })
})
