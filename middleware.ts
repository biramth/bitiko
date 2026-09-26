import { next, rewrite } from '@vercel/edge'

/**
 * Link-preview crawlers (WhatsApp, Facebook, Twitter/X, Slack, Telegram,
 * LinkedIn, Discord…) don't execute JavaScript, so they would only ever see
 * the generic "Bitiko" tags baked into index.html. This edge middleware
 * catches their requests for real URLs — platform pages (home, solutions,
 * legal) as well as storefront URLs (home, catalogue, product, custom
 * page) — and rewrites them to the dynamic OG generator (/api/og),
 * which builds per-page tags. Real visitors and JS-rendering
 * search engines (Googlebot) are left untouched: they still get the static
 * SPA through the normal rewrite, with zero added latency.
 */
const BOT_PATTERN =
  /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot|SkypeUriPreview|Pinterest|VKShare|WeChat|Line\s?Bot/i

const PLATFORM_HOST = /^(www\.)?bitiko\.shop$/i

export default function middleware(request: Request): Response {
  const userAgent = request.headers.get('user-agent') ?? ''

  const url = new URL(request.url)
  const pathname = url.pathname

  if (!BOT_PATTERN.test(userAgent)) {
    // Vercel sert le fichier dist/index.html pour « / » avant toute réécriture de vercel.json :
    // seule une réécriture de middleware peut donner la page d'accueil prérendue à la racine.
    if (pathname === '/' && PLATFORM_HOST.test(request.headers.get('host') ?? '')) {
      return rewrite(new URL('/prerendered/home.html', request.url))
    }
    return next()
  }

  url.pathname = '/api/og'
  url.search = `?path=${encodeURIComponent(pathname)}`

  return rewrite(url)
}

export const config = {
  matcher: [
    '/',
    '/solutions/:path*',
    '/legal/:path*',
    '/catalogue',
    '/prestations',
    '/reserver',
    '/produits/:path*',
    '/pages/:path*',
  ],
}