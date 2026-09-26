import { describe, expect, it } from 'vitest'
import { bookingNotificationEmailHtml } from './emailTemplates.js'

describe('bookingNotificationEmailHtml', () => {
  it('échappe tout ce qui vient du visiteur', () => {
    const html = bookingNotificationEmailHtml({
      origin: 'https://bitiko.shop',
      shopName: 'Salon <b>Awa</b>',
      kind: 'appointment',
      customerName: '<script>alert(1)</script>',
      customerPhone: '+221771234567',
      whenLabel: 'mardi 29 septembre, 10:00',
      detail: 'Coupe & brushing',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>Awa</b>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('Coupe &amp; brushing')
    expect(html).toContain('https://bitiko.shop/admin/rendez-vous')
  })

  it('pointe vers les réservations pour une table', () => {
    const html = bookingNotificationEmailHtml({
      origin: 'https://bitiko.shop',
      shopName: 'Chez Awa',
      kind: 'reservation',
      customerName: 'Moussa',
      customerPhone: '+221779998877',
      whenLabel: 'vendredi, 20:00',
      detail: 'Table pour 4',
    })
    expect(html).toContain('/admin/reservations')
    expect(html).toContain('Nouvelle demande de réservation')
  })
})
