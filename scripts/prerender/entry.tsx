import { renderToString } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Route, Routes, StaticRouter } from 'react-router-dom'
import { LandingPage } from '@/pages/marketing/LandingPage'
import { SolutionPage } from '@/pages/marketing/SolutionPage'
import { SOLUTION_PAGES } from '@/pages/marketing/solutions/data'
import { TermsPage } from '@/pages/legal/TermsPage'
import { PrivacyPage } from '@/pages/legal/PrivacyPage'
import { renderPrerenderedHtml } from '@/seo/prerenderHtml'

export const assemble = renderPrerenderedHtml

/** Pages publiques de la plateforme à prérendre : le nom du fichier statique, et le chemin servi. */
export const PAGES: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  ...SOLUTION_PAGES.map((page) => ({ name: `solutions-${page.slug}`, path: `/solutions/${page.slug}` })),
  { name: 'legal-cgu', path: '/legal/cgu' },
  { name: 'legal-confidentialite', path: '/legal/confidentialite' },
]

interface Captured {
  __seo?: { title: string; description?: string; canonicalUrl?: string; noindex?: boolean }
  __jsonld?: Record<string, unknown>
}

/** Rend une page dans un routeur statique et renvoie son HTML plus les balises qu'elle a déclarées. */
export function renderPage(path: string) {
  const globals = globalThis as Captured
  globals.__seo = undefined
  globals.__jsonld = {}
  const client = new QueryClient()
  const html = renderToString(
    <QueryClientProvider client={client}>
      <StaticRouter location={path}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/solutions/:slug" element={<SolutionPage />} />
          <Route path="/legal/cgu" element={<TermsPage />} />
          <Route path="/legal/confidentialite" element={<PrivacyPage />} />
        </Routes>
      </StaticRouter>
    </QueryClientProvider>,
  )
  return { html, seo: globals.__seo, jsonld: Object.values(globals.__jsonld ?? {}) }
}
