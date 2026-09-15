import type { TenantContext } from '@/types'

const ROOT_DOMAIN = import.meta.env.VITE_ROOT_DOMAIN as string | undefined
const DEV_SHOP_SLUG = import.meta.env.VITE_DEV_SHOP_SLUG as string | undefined

/** Root domain for display purposes (onboarding preview) even before one is configured. */
export const DISPLAY_ROOT_DOMAIN = ROOT_DOMAIN ?? 'bitiko.shop'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

/**
 * Every shop gets a free "<slug>.<ROOT_DOMAIN>" subdomain; a shop can later
 * attach its own custom_domain instead. The platform's own root domain (and
 * bare "www") serves the marketing site + signup + merchant dashboard.
 *
 * Locally there's no real DNS, so a `?boutique=<slug>` query param or the
 * VITE_DEV_SHOP_SLUG env var lets you preview a specific storefront on
 * localhost without deploying.
 */
export function resolveTenant(hostname: string, search: string): TenantContext {
  // `?boutique=<slug>` targets a specific store from any host. It's the
  // builder live-preview mechanism (preview=draft) and the local-DNS-free
  // way to reach a store on localhost or a root domain without wildcard
  // subdomains. Trailing slashes are stripped ("/?boutique=foo/").
  const boutiqueParam = new URLSearchParams(search).get('boutique')
  if (boutiqueParam) {
    return { type: 'shop', slug: boutiqueParam.replace(/\/+$/, '') }
  }
  if (LOCAL_HOSTS.has(hostname) && DEV_SHOP_SLUG) {
    return { type: 'shop', slug: DEV_SHOP_SLUG.replace(/\/+$/, '') }
  }

  if (!ROOT_DOMAIN || LOCAL_HOSTS.has(hostname)) {
    return { type: 'platform' }
  }

  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    return { type: 'platform' }
  }

  // Vercel's own preview/production URLs (*.vercel.app) are the platform too
  // — otherwise, before the real domain's DNS is live (or when just checking
  // a deploy), the hostname falls through to the "customDomain" case below
  // and looks like an unregistered merchant domain ("cette boutique n'existe
  // pas") instead of the actual marketing site. `?boutique=<slug>` above
  // still takes priority, so previewing a shop on a *.vercel.app URL keeps
  // working exactly as before.
  if (hostname.endsWith('.vercel.app')) {
    return { type: 'platform' }
  }

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length + 1))
    return { type: 'shop', slug }
  }

  // Any other hostname is a candidate custom domain a merchant connected.
  return { type: 'shop', customDomain: hostname }
}

export function getCurrentTenant(): TenantContext {
  return resolveTenant(window.location.hostname, window.location.search)
}

const RESERVED_SLUGS = new Set([
  'www',
  'admin',
  'api',
  'app',
  'assets',
  'static',
  'blog',
  'help',
  'support',
  'mail',
  'ftp',
  'dashboard',
  'inscription',
  'connexion',
  'bitiko',
])

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && slug.length >= 3 && !RESERVED_SLUGS.has(slug)
}

export function shopUrl(slug: string): string {
  if (!ROOT_DOMAIN) return `/?boutique=${slug}`
  const protocol = window.location.protocol
  return `${protocol}//${slug}.${ROOT_DOMAIN}`
}

/** Storefront URL for a given page path. With a ROOT_DOMAIN it's the
 * "<slug>.<ROOT_DOMAIN>" subdomain; otherwise (local dev / preview) it's the
 * real path with `?boutique=<slug>` appended — tenant resolution reads that
 * query param regardless of pathname, so every route (catalogue, produit,
 * panier, commande, pages/:slug) works identically to a real subdomain. */
export function storefrontUrl(slug: string, pagePath = '/'): string {
  if (!ROOT_DOMAIN) {
    const query = new URLSearchParams({ boutique: slug })
    return `${pagePath}?${query.toString()}`
  }
  const protocol = window.location.protocol
  return `${protocol}//${slug}.${ROOT_DOMAIN}${pagePath}`
}

/** Link back to the Bitiko marketing site from a shop's own storefront. */
export function platformUrl(): string {
  if (!ROOT_DOMAIN) return '/'
  return `${window.location.protocol}//${ROOT_DOMAIN}`
}
