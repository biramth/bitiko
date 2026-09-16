import { NextRequest, NextResponse } from '@vercel/edge'

/**
 * Link-preview crawlers (WhatsApp, Facebook, Twitter/X, Slack, Telegram,
 * LinkedIn, Discord…) don't execute JavaScript, so they would only ever see
 * the generic "Bitiko" tags baked into index.html. This edge middleware
 * catches their requests for real storefront URLs — home, catalogue, product,
 * custom page — and rewrites them to the dynamic OG generator (/api/og),
 * which builds per-shop/pre-per-product tags. Real visitors and JS-rendering
 * search engines (Googlebot) are left untouched: they still get the static
 * SPA through the normal rewrite, with zero added latency.
 */
const BOT_PATTERN =
  /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot|SkypeUriPreview|Pinterest|VKShare|WeChat|Line\s?Bot/i

export default function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? ''

  if (!BOT_PATTERN.test(userAgent)) {
    return NextResponse.next()
  }

  const url = new URL(request.url)
  const pathname = url.pathname

  url.pathname = '/api/og'
  url.search = new URLSearchParams({ path: pathname })

  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/', '/catalogue', '/produits/:path*', '/pages/:path*'],
}