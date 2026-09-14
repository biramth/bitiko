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
  const devSlug = new URLSearchParams(search).get('boutique') ?? DEV_SHOP_SLUG
  if (LOCAL_HOSTS.has(hostname) && devSlug) {
    return { type: 'shop', slug: devSlug }
  }

  if (!ROOT_DOMAIN || LOCAL_HOSTS.has(hostname)) {
    return { type: 'platform' }
  }

  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
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

/** Link back to the Bitiko marketing site from a shop's own storefront. */
export function platformUrl(): string {
  if (!ROOT_DOMAIN) return '/'
  return `${window.location.protocol}//${ROOT_DOMAIN}`
}
