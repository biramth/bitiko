import { describe, expect, it } from 'vitest'
import { buildOrdersCsv, type ExportOrder } from './ordersCsv'

const order = (overrides: Partial<ExportOrder>): ExportOrder =>
  ({
    id: '1', shop_id: 's', order_number: '#0001', customer_name: 'Awa', customer_phone: '+221771234567', customer_address: 'Dakar',
    customer_email: null, delivery_zone_name: 'Dakar', delivery_fee: 1500, payment_method: 'cod', notes: null, status: 'paid',
    total: 26500, created_at: '2026-09-05T10:00:00Z', updated_at: '2026-09-05T10:00:00Z',
    items: [{ product_name: 'Robe wax', variant_name: 'M', quantity: 1 }],
    ...overrides,
  }) as ExportOrder

describe('buildOrdersCsv', () => {
  it('produit un CSV Excel (BOM, ;) avec sous-total, livraison et total séparés', () => {
    const csv = buildOrdersCsv([order({})], 'XOF')
    expect(csv.startsWith('﻿Commande;Date;Statut')).toBe(true)
    expect(csv).toContain("#0001;05/09/2026;Payée;Awa;'+221771234567;Dakar;Dakar;1 × Robe wax (M);25000;1500;26500;Espèces à la livraison;")
  })

  it('trie par date et neutralise les formules', () => {
    const csv = buildOrdersCsv(
      [order({ order_number: '#0002', created_at: '2026-09-06T10:00:00Z' }), order({ customer_name: '=CMD()', order_number: '#0001' })],
      'XOF',
    )
    expect(csv.indexOf('#0001')).toBeLessThan(csv.indexOf('#0002'))
    expect(csv).toContain("'=CMD()")
  })
})
