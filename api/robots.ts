import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Vercel Function (not a static file) because the Sitemap directive needs an
 * absolute URL on the REQUESTING host — every shop subdomain needs its own
 * robots.txt pointing at its own sitemap.xml, which a single static file
 * under /public can't do across a wildcard domain.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const host = (req.headers.host ?? '').split(':')[0]
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${host}`

  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n')

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(body)
}
