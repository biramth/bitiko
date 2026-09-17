import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const ROOT_DOMAIN = process.env.VITE_ROOT_DOMAIN

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function urlEntry(loc: string): string {
  return `  <url><loc>${xmlEscape(loc)}</loc></url>`
}

function isPlatformHost(host: string): boolean {
  return !ROOT_DOMAIN || host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`
}

function robotsBody(origin: string): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n')
}

/**
 * One function that serves both /robots.txt and /sitemap.xml (matched via the
 * rewrites in vercel.json), so both can stay dynamic per host. /robots.txt
 * needs an absolute Sitemap URL on the REQUESTING host — every shop subdomain
 * needs its own robots.txt pointing at its own sitemap, which a single static
 * file under /public can't do across a wildcard domain. The sitemap is
 * regenerated on every crawl (cached at the edge) since merchants add/remove
 * products constantly.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = (req.headers.host ?? '').split(':')[0]
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${host}`

  const kind = req.query.kind === 'robots' ? 'robots' : 'sitemap'

  if (kind === 'robots') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(robotsBody(origin))
    return
  }

  const urls: string[] = []

  if (isPlatformHost(host)) {
    urls.push(
      // Note: /admin/login (which replaced /inscription) is noindex —
      // see LoginPage.tsx's usePageSeo call — so it isn't listed here.
      urlEntry(`${origin}/`),
      urlEntry(`${origin}/legal/cgu`),
      urlEntry(`${origin}/legal/confidentialite`),
    )
  } else {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      urls.push(urlEntry(`${origin}/`), urlEntry(`${origin}/catalogue`))

      const isSubdomain = !!ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)
      const slug = isSubdomain ? host.slice(0, -(ROOT_DOMAIN!.length + 1)) : null

      if (slug) {
        const { data: shop } = await supabase.from('shops').select('id').ilike('slug', slug).maybeSingle()

        if (shop) {
          const [{ data: products }, { data: pages }] = await Promise.all([
            supabase
              .from('products')
              .select('slug')
              .eq('shop_id', shop.id)
              .eq('active', true),
            supabase
              .from('pages')
              .select('slug')
              .eq('shop_id', shop.id)
              .eq('is_published', true),
          ])

          for (const product of products ?? []) {
            urls.push(urlEntry(`${origin}/produits/${product.slug}`))
          }
          for (const page of pages ?? []) {
            urls.push(urlEntry(`${origin}/pages/${page.slug}`))
          }
        }
      }
    } else {
      urls.push(urlEntry(`${origin}/`))
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}