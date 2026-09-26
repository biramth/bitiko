import { describe, expect, it } from 'vitest'
import { renderPrerenderedHtml } from './prerenderHtml'

const TEMPLATE = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="description"
      content="Ancienne description"
    />
    <link rel="canonical" href="https://bitiko.shop/" />
    <meta property="og:url" content="https://bitiko.shop/" />
    <meta property="og:title" content="Ancien titre" />
    <meta name="robots" content="index, follow" />
    <title>Ancien titre</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`

const base = { html: '<h1>Bonjour</h1>', jsonLd: [] as unknown[], fallbackCanonical: 'https://bitiko.shop/solutions/x' }

describe('renderPrerenderedHtml', () => {
  it('remplace titre, description, canonique et contenu, en gardant le reste de la page', () => {
    const out = renderPrerenderedHtml(TEMPLATE, { ...base, seo: { title: 'Nouveau & titre', description: 'Une "description"' } })
    expect(out).toContain('<title>Nouveau &amp; titre</title>')
    expect(out).toContain('content="Une &quot;description&quot;"')
    expect(out).not.toContain('Ancienne description')
    expect(out).toContain('<link rel="canonical" href="https://bitiko.shop/solutions/x" />')
    expect(out).toContain('<div id="root"><h1>Bonjour</h1></div>')
    expect(out).toContain('<script type="module" src="/assets/index.js"></script>')
    expect(out.match(/<title>/g)).toHaveLength(1)
  })

  it('utilise la canonique déclarée par la page et ajoute les balises manquantes', () => {
    const out = renderPrerenderedHtml(TEMPLATE, { ...base, seo: { title: 'T', description: 'D', canonicalUrl: 'https://bitiko.shop/legal/cgu' } })
    expect(out).toContain('href="https://bitiko.shop/legal/cgu"')
    expect(out).toContain('<meta name="twitter:title" content="T" />')
    expect(out).toContain('<meta property="og:description" content="D" />')
  })

  it('marque une page noindex', () => {
    const out = renderPrerenderedHtml(TEMPLATE, { ...base, seo: { title: 'T', noindex: true } })
    expect(out).toContain('<meta name="robots" content="noindex, nofollow" />')
  })

  it('injecte le JSON-LD de la page sans pouvoir fermer la balise script', () => {
    const out = renderPrerenderedHtml(TEMPLATE, { ...base, seo: { title: 'T' }, jsonLd: [{ '@type': 'FAQPage', text: '</script><b>' }] })
    expect(out).toContain('<script type="application/ld+json">')
    expect(out).not.toContain('</script><b>')
    expect((out.match(/application\/ld\+json/g) ?? []).length).toBe(1)
  })

  it('prévoit un repli sans JavaScript pour les blocs animés', () => {
    expect(renderPrerenderedHtml(TEMPLATE, { ...base, seo: { title: 'T' } })).toContain('<noscript><style>')
  })
})
