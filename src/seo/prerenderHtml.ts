import { serializeJsonLd } from './jsonLd'

export interface PrerenderSeo {
  title: string
  description?: string
  canonicalUrl?: string
  noindex?: boolean
}

export interface PrerenderInput {
  /** HTML rendu de l'application pour la page (contenu de #root). */
  html: string
  seo: PrerenderSeo
  /** Blocs JSON-LD propres à la page (FAQ, fil d'Ariane…) — le graphe global reste celui d'index.html. */
  jsonLd: unknown[]
  /** URL canonique par défaut quand la page n'en déclare pas. */
  fallbackCanonical: string
}

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Remplace la balise <meta> identifiée par `attr="key"` (ou l'ajoute avant </head>). */
function setMeta(html: string, attr: 'name' | 'property', key: string, content: string): string {
  const tag = `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`
  const pattern = new RegExp(`<meta\\s[^>]*?${attr}="${escapeRegExp(key)}"[^>]*?>`, 's')
  return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', () => `    ${tag}\n  </head>`)
}

/**
 * Assemble la page prérendue à partir de l'index.html construit : titre, description, canonique, cartes de
 * partage, JSON-LD de la page et contenu de #root. Sert aux robots qui n'exécutent pas (ou mal) le JavaScript ;
 * l'application se monte ensuite normalement par-dessus (createRoot remplace ce contenu). Pure — testée.
 */
export function renderPrerenderedHtml(template: string, input: PrerenderInput): string {
  const { seo, html: body, jsonLd, fallbackCanonical } = input
  const canonical = seo.canonicalUrl ?? fallbackCanonical
  let out = template

  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeText(seo.title)}</title>`)
  out = out.replace(/<link\s+rel="canonical"[^>]*>/, () => `<link rel="canonical" href="${escapeAttr(canonical)}" />`)
  out = setMeta(out, 'property', 'og:url', canonical)
  out = setMeta(out, 'property', 'og:title', seo.title)
  out = setMeta(out, 'name', 'twitter:title', seo.title)
  if (seo.description) {
    out = setMeta(out, 'name', 'description', seo.description)
    out = setMeta(out, 'property', 'og:description', seo.description)
    out = setMeta(out, 'name', 'twitter:description', seo.description)
  }
  out = setMeta(out, 'name', 'robots', seo.noindex ? 'noindex, nofollow' : 'index, follow')

  const scripts = jsonLd.map((data) => `    <script type="application/ld+json">${serializeJsonLd(data)}</script>`).join('\n')
  // Sans JavaScript, les blocs « Reveal » (opacité 0 tant qu'ils ne sont pas vus) resteraient invisibles.
  const noscript =
    '    <noscript><style>.opacity-0{opacity:1!important}.translate-y-8{transform:none!important}img[data-fade]{opacity:1!important}</style></noscript>'
  out = out.replace('</head>', () => `${scripts ? scripts + '\n' : ''}${noscript}\n  </head>`)

  return out.replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
}
