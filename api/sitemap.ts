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

/**
 * Per-host sitemap: the platform's own marketing pages on the root domain,
 * or a shop's live catalog (active products only, matching what RLS already
 * exposes to anon) on that shop's subdomain/custom domain. Regenerated on
 * every crawl (cached at the edge for an hour) since merchants add/remove
 * products constantly — a static sitemap would go stale immediately.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = (req.headers.host ?? '').split(':')[0]
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${host}`

  const urls: string[] = []

  if (isPlatformHost(host)) {
    urls.push(
      urlEntry(`${origin}/`),
      urlEntry(`${origin}/inscription`),
      urlEntry(`${origin}/legal/cgu`),
      urlEntry(`${origin}/legal/confidentialite`),
    )
  } else {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const isSubdomain = !!ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)
      const slug = isSubdomain ? host.slice(0, -(ROOT_DOMAIN!.length + 1)) : null

      const { data: shop } = await (slug
        ? supabase.from('shops').select('id').ilike('slug', slug).maybeSingle()
        : supabase.from('shops').select('id').ilike('custom_domain', host).maybeSingle())

      urls.push(urlEntry(`${origin}/`), urlEntry(`${origin}/catalogue`))

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
