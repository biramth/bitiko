import { useEffect } from 'react'

const SCRIPT_ID = 'faq-structured-data'

/** Injects FAQPage JSON-LD from a page's own visible FAQ content — eligible
 * for Google's FAQ rich results (the Q&As shown directly in search results),
 * which is a real visibility boost for a page competing on category terms
 * ("créer boutique en ligne", "vendre sur WhatsApp"…) rather than its own
 * brand name. Does not affect link-preview bots, which don't execute JS. */
export function useFaqStructuredData(items: { question: string; answer: string }[]) {
  useEffect(() => {
    if (items.length === 0) return

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = SCRIPT_ID
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById(SCRIPT_ID)?.remove()
    }
  }, [items])
}
