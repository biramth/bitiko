import { describe, expect, it } from 'vitest'
import { orderStatusMessage } from './orderMessages'

const base = { order_number: '#0042', customer_name: 'Awa Mbaye', total: 51500, payment_method: 'cod' }

describe('orderStatusMessage', () => {
  it('salue par le prénom et cite la commande sans doubler le #', () => {
    const message = orderStatusMessage({ ...base, status: 'pending' }, 'Wax & Style', 'XOF')
    expect(message).toContain('Bonjour Awa,')
    expect(message).toContain('commande #0042')
    expect(message).not.toContain('##')
    expect(message).toContain('— Wax & Style')
  })

  it('demande le paiement mobile money à la confirmation, pas pour les espèces', () => {
    const momo = orderStatusMessage({ ...base, status: 'confirmed', payment_method: 'mobile_money' }, 'Boutique', 'XOF')
    const cod = orderStatusMessage({ ...base, status: 'confirmed' }, 'Boutique', 'XOF')
    expect(momo).toContain('mobile money')
    expect(momo).toContain('preuve de paiement')
    expect(cod).toContain('espèces à la livraison')
  })

  it('couvre chaque statut avec un texte différent', () => {
    const texts = ['pending', 'confirmed', 'paid', 'delivered', 'cancelled'].map((status) =>
      orderStatusMessage({ ...base, status }, 'Boutique', 'XOF'),
    )
    expect(new Set(texts).size).toBe(5)
  })
})
