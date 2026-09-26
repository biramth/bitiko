import { faqJsonLd } from '@/seo/jsonLd'

export function useFaqStructuredData(items: { question: string; answer: string }[]) {
  const globals = globalThis as { __jsonld?: Record<string, unknown> }
  globals.__jsonld = globals.__jsonld ?? {}
  globals.__jsonld['faq'] = faqJsonLd(items)
}
