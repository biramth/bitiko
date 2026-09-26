import { useEffect } from 'react'

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
      description:
        'Bitiko donne à chaque activité sa présence en ligne : boutique e-commerce, prise de rendez-vous, réservation de tables, catalogue de services et finances simples (bilan PDF et Excel).',
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById(SCRIPT_ID)?.remove()
    }
  }, [])
}
