import { describe, expect, it } from 'vitest'
import { breadcrumbJsonLd, faqJsonLd, serializeJsonLd, shopJsonLd, solutionJsonLd } from './jsonLd'

describe('jsonLd', () => {
  it('construit un FAQPage à partir des questions visibles', () => {
    const data = faqJsonLd([{ question: 'Q ?', answer: 'R.' }])
    expect(data['@type']).toBe('FAQPage')
    expect(data.mainEntity[0]).toMatchObject({ name: 'Q ?', acceptedAnswer: { text: 'R.' } })
  })

  it('numérote le fil d’Ariane à partir de 1 avec des URL absolues', () => {
    const data = breadcrumbJsonLd([{ name: 'Accueil', path: '/' }, { name: 'Solutions', path: '/solutions/x' }], 'https://bitiko.shop')
    expect(data.itemListElement.map((i) => [i.position, i.item])).toEqual([[1, 'https://bitiko.shop/'], [2, 'https://bitiko.shop/solutions/x']])
  })

  it('rattache une page de solution au site et à l’application', () => {
    const data = solutionJsonLd({ slug: 'restaurant', metaTitle: 'T', metaDescription: 'D', audience: 'Restaurants' })
    expect(data.url).toBe('https://bitiko.shop/solutions/restaurant')
    expect(data.isPartOf['@id']).toBe('https://bitiko.shop/#website')
  })

  it('neutralise </script> dans la sérialisation', () => {
    const out = serializeJsonLd({ a: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(JSON.parse(out).a).toBe('</script><script>alert(1)</script>')
  })
})

describe('shopJsonLd', () => {
  const base = { name: 'Salon Awa', description: null, logo_url: null, banner_url: null, whatsapp_number: null, address: null, country_code: 'SN', social_links: null }

  it('reste minimal quand la boutique est peu renseignée', () => {
    const data = shopJsonLd(base, 'https://salon-awa.bitiko.shop/')
    expect(data).toMatchObject({ '@type': 'LocalBusiness', name: 'Salon Awa', url: 'https://salon-awa.bitiko.shop/' })
    expect(JSON.parse(JSON.stringify(data))).not.toHaveProperty('telephone')
    expect(JSON.parse(JSON.stringify(data))).not.toHaveProperty('address')
  })

  it('renseigne téléphone, adresse, image et réseaux, en ignorant les liens non http(s)', () => {
    const data = shopJsonLd(
      { ...base, whatsapp_number: '+221771234567', address: 'Sacré-Cœur 3, Dakar', logo_url: 'https://cdn/logo.png', banner_url: 'https://cdn/b.png', social_links: { instagram: 'https://instagram.com/awa', x: 'javascript:alert(1)', tiktok: '' } },
      'https://salon-awa.bitiko.shop/',
    )
    expect(data.telephone).toBe('+221771234567')
    expect(data.address).toMatchObject({ streetAddress: 'Sacré-Cœur 3, Dakar', addressCountry: 'SN' })
    expect(data.image).toBe('https://cdn/b.png')
    expect(data.sameAs).toEqual(['https://instagram.com/awa'])
  })
})
