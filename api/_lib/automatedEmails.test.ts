import { describe, expect, it } from 'vitest'
import { automatedEmailHtml } from './emailTemplates.js'

const VARS = {
  shopName: 'Awa Boutique',
  shopUrl: 'https://awa.bitiko.shop',
  ownerName: 'Awa',
  planName: 'Essentiel',
  periodEndLabel: '27 octobre 2026',
  amountLabel: '5 000 FCFA',
}

describe('automatedEmailHtml', () => {
  it('rend le contenu par défaut sans surcharge (bienvenue)', () => {
    const { subject, html } = automatedEmailHtml({
      key: 'welcome',
      origin: 'https://bitiko.shop',
      vars: VARS,
      override: null,
    })
    expect(subject).toBe('Awa Boutique est en ligne — Bitiko')
    expect(html).toContain('Awa Boutique est en ligne !')
    expect(html).toContain('https://bitiko.shop/admin/produits/nouveau')
    expect(html).not.toContain('{{')
  })

  it('applique la surcharge : variables, **gras** et bouton relatif', () => {
    const { subject, html } = automatedEmailHtml({
      key: 'renewal-reminder',
      origin: 'https://bitiko.shop',
      vars: VARS,
      override: {
        subject: 'Plus que quelques jours, {{shop_name}} ({{plan_name}})',
        body: 'Bonjour {{owner_name}}, ton offre **{{plan_name}}** se termine le {{period_end}} : {{amount}} pour continuer.',
        buttonLabel: 'Je renouvelle',
        buttonUrl: '/admin/parametres/compte?billing=1',
      },
    })
    expect(subject).toBe('Plus que quelques jours, Awa Boutique (Essentiel)')
    expect(html).toContain('Bonjour Awa, ton offre <strong>Essentiel</strong> se termine le 27 octobre 2026')
    expect(html).toContain('5 000 FCFA pour continuer.')
    expect(html).toContain('https://bitiko.shop/admin/parametres/compte?billing=1')
    expect(html).toContain('Je renouvelle')
  })

  it('utilise le vrai nom du plan dans le titre (plus de « Pro » en dur)', () => {
    const { html } = automatedEmailHtml({
      key: 'renewal-reminder',
      origin: 'https://bitiko.shop',
      vars: VARS,
      override: null,
    })
    expect(html).toContain('Ton abonnement Essentiel expire bientôt')
    expect(html).not.toContain('abonnement Pro')
  })

  it('ignore une surcharge vide et garde le contenu par défaut', () => {
    const { subject, html } = automatedEmailHtml({
      key: 'plan-activated',
      origin: 'https://bitiko.shop',
      vars: VARS,
      override: { subject: '  ', body: '', buttonLabel: null, buttonUrl: null },
    })
    expect(subject).toBe('Bienvenue dans Bitiko Essentiel — Awa Boutique')
    expect(html).toContain('https://bitiko.shop/admin')
  })

  it('échappe un nom de boutique hostile, y compris dans le bouton', () => {
    const hostile = { ...VARS, shopName: '<script>alert(1)</script>' }
    const { subject, html } = automatedEmailHtml({
      key: 'plan-activated',
      origin: 'https://bitiko.shop',
      vars: hostile,
      override: null,
    })
    // L'objet part en texte brut (pas d'échappement HTML dans une boîte mail)…
    expect(subject).toContain('<script>alert(1)</script>')
    // …mais le HTML ne doit jamais contenir la balise injectée.
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('replie un lien de bouton invalide vers le tableau de bord', () => {
    const { html } = automatedEmailHtml({
      key: 'welcome',
      origin: 'https://bitiko.shop',
      vars: VARS,
      override: {
        subject: 'Sujet',
        body: 'Contenu',
        buttonLabel: 'Go',
        buttonUrl: 'javascript:alert(1)',
      },
    })
    expect(html).toContain('https://bitiko.shop/admin')
    expect(html).not.toContain('javascript:')
  })
})
