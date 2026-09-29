import { useEffect } from 'react'
import { CONTACT_EMAIL, SUPPORT_EMAIL } from '@/config/contact'

const SCRIPT_ID = 'software-structured-data'

/** Injects SoftwareApplication JSON-LD describing Bitiko as a SaaS for
 *  business activities (not just e-commerce) — helps search engines
 *  categorize the product beyond "boutique en ligne" queries. */
export function useSoftwareStructuredData() {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = SCRIPT_ID
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Bitiko',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'XOF' },
      provider: {
        '@type': 'Organization',
        name: 'Bitiko',
        url: 'https://bitiko.shop',
        email: CONTACT_EMAIL,
        contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SUPPORT_EMAIL, availableLanguage: 'French' },
      },
      description:
        'Boutique en ligne, prise de rendez-vous, réservation de tables et finances simples (bilan PDF et Excel) pour les commerces et les prestataires de services. Commandes sur WhatsApp, sans commission.',
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById(SCRIPT_ID)?.remove()
    }
  }, [])
}
