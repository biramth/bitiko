/** Données structurées (schema.org) partagées entre les pages (injection dans le navigateur) et le prérendu (HTML statique). Pures. */

export const SITE_ORIGIN = 'https://bitiko.shop'

export interface Crumb {
  name: string
  path: string
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

export function breadcrumbJsonLd(crumbs: Crumb[], origin: string = SITE_ORIGIN) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: origin + crumb.path,
    })),
  }
}

/** Page de solution : une page web qui décrit le service pour un public précis, rattachée à l'organisation. */
export function solutionJsonLd(page: { slug: string; metaTitle: string; metaDescription: string; audience: string }, origin: string = SITE_ORIGIN) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${origin}/solutions/${page.slug}#page`,
    url: `${origin}/solutions/${page.slug}`,
    name: page.metaTitle,
    description: page.metaDescription,
    inLanguage: 'fr',
    isPartOf: { '@id': `${origin}/#website` },
    about: { '@id': `${origin}/#software` },
    audience: { '@type': 'Audience', audienceType: page.audience },
  }
}

/** Sérialisation sûre pour une balise <script type="application/ld+json"> : neutralise `<` (donc `</script>`) et les séparateurs de ligne Unicode. */
export function serializeJsonLd(data: unknown): string {
  const backslash = String.fromCharCode(92)
  return JSON.stringify(data)
    .split('<').join(backslash + 'u003c')
    .split(String.fromCharCode(0x2028)).join(backslash + 'u2028')
    .split(String.fromCharCode(0x2029)).join(backslash + 'u2029')
}

export interface ShopSeoInput {
  name: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  whatsapp_number: string | null
  address: string | null
  country_code: string
  social_links: Record<string, string> | null
}

/**
 * Fiche d'entreprise locale d'une vitrine (page d'accueil du commerçant) : nom, lien, logo, téléphone, adresse, réseaux.
 * Aide Google à relier la boutique à sa marque et à ses réseaux ; ne contient jamais de champ vide. Pure.
 */
export function shopJsonLd(shop: ShopSeoInput, url: string) {
  const sameAs = Object.values(shop.social_links ?? {}).filter((link) => /^https?:\/\//i.test(link))
  const phone = shop.whatsapp_number?.trim()
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}#business`,
    name: shop.name,
    url,
    description: shop.description ?? undefined,
    image: shop.banner_url ?? shop.logo_url ?? undefined,
    logo: shop.logo_url ?? undefined,
    telephone: phone || undefined,
    address: shop.address ? { '@type': 'PostalAddress', streetAddress: shop.address, addressCountry: shop.country_code } : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  }
}
