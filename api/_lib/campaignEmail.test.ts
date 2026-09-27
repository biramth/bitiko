import { describe, expect, it } from 'vitest'
import { campaignEmailHtml } from './emailTemplates.js'

const BASE = {
  origin: 'https://bitiko.shop',
  subject: 'Nouveauté pour {{shop_name}}',
  body: 'Bonjour **{{owner_name}}**, une nouveauté arrive.',
  shopName: 'Chez Awa',
  shopUrl: 'chez-awa.bitiko.shop',
  ownerName: 'Awa',
  unsubscribeUrl: 'https://bitiko.shop/api/campaigns/unsubscribe?u=00000000-0000-0000-0000-0000000000a1&t=abc123',
}

describe('campaignEmailHtml', () => {
  it('inclut un lien de désabonnement fonctionnel', () => {
    const html = campaignEmailHtml(BASE)
    // « & » est échappé en HTML (&amp;) dans un attribut — comportement correct, pas un bug.
    expect(html).toContain('href="https://bitiko.shop/api/campaigns/unsubscribe?u=00000000-0000-0000-0000-0000000000a1&amp;t=abc123"')
    expect(html).toContain('désabonner')
  })

  it('échappe le lien de désabonnement (défense en profondeur)', () => {
    const html = campaignEmailHtml({ ...BASE, unsubscribeUrl: 'https://x/?a="><script>alert(1)</script>' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('substitue les variables dans le sujet et le corps', () => {
    const html = campaignEmailHtml(BASE)
    expect(html).toContain('Nouveauté pour Chez Awa')
    expect(html).toContain('Awa')
  })
})
