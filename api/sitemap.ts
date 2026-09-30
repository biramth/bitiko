import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { SOLUTION_PAGES } from '../src/pages/marketing/solutions/data.js'

const ROOT_DOMAIN = process.env.VITE_ROOT_DOMAIN

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function urlEntry(
  loc: string,
  opts?: { lastmod?: string; changefreq?: string; priority?: string; images?: string[] },
): string {
  const extra = [
    opts?.lastmod ? `<lastmod>${opts.lastmod}</lastmod>` : '',
    opts?.changefreq ? `<changefreq>${opts.changefreq}</changefreq>` : '',
    opts?.priority ? `<priority>${opts.priority}</priority>` : '',
    ...(opts?.images ?? []).map((src) => `<image:image><image:loc>${xmlEscape(src)}</image:loc></image:image>`),
  ].join('')
  return `  <url><loc>${xmlEscape(loc)}</loc>${extra}</url>`
}

const SOLUTION_SLUGS = SOLUTION_PAGES.map((page) => page.slug)

/** AAAA-MM-JJ d'une date ISO (format attendu par <lastmod>), ou undefined si absente / invalide. */
function dateOnly(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined
}

function isPlatformHost(host: string): boolean {
  return !ROOT_DOMAIN || host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`
}

function robotsBody(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    // Le crawl des espaces privés ne sert à rien (ils portent déjà noindex
    // via usePageSeo) — on économise le budget de crawl pour les pages
    // publiques qui rapportent du trafic.
    'Disallow: /api/',
    'Disallow: /admin/',
    'Disallow: /plateforme/',
    'Disallow: /panier',
    'Disallow: /commande',
    'Disallow: /compte',
    'Disallow: /auth/',
    'Disallow: /*?preview=',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
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
      urlEntry(`${origin}/`, { changefreq: 'daily', priority: '1.0' }),
      ...SOLUTION_SLUGS.map((slug) =>
        urlEntry(`${origin}/solutions/${slug}`, { changefreq: 'weekly', priority: '0.8' }),
      ),
      urlEntry(`${origin}/legal/cgu`, { changefreq: 'yearly', priority: '0.3' }),
      urlEntry(`${origin}/legal/confidentialite`, { changefreq: 'yearly', priority: '0.3' }),
      urlEntry(`${origin}/legal/cookies`, { changefreq: 'yearly', priority: '0.3' }),
      urlEntry(`${origin}/legal/mentions-legales`, { changefreq: 'yearly', priority: '0.3' }),
      urlEntry(`${origin}/legal/cgv`, { changefreq: 'yearly', priority: '0.3' }),
      urlEntry(`${origin}/legal/accessibilite`, { changefreq: 'yearly', priority: '0.3' }),
    )
  } else {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      urls.push(
        urlEntry(`${origin}/`, { changefreq: 'daily', priority: '1.0' }),
        urlEntry(`${origin}/catalogue`, { changefreq: 'daily', priority: '0.8' }),
        urlEntry(`${origin}/prestations`, { changefreq: 'daily', priority: '0.8' }),
        urlEntry(`${origin}/reserver`, { changefreq: 'weekly', priority: '0.5' }),
      )

      const isSubdomain = !!ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)
      const slug = isSubdomain ? host.slice(0, -(ROOT_DOMAIN!.length + 1)) : null

      if (slug) {
        const { data: shop } = await supabase.from('shops').select('id').ilike('slug', slug).maybeSingle()

        if (shop) {
          const [{ data: products }, { data: pages }] = await Promise.all([
            supabase
              .from('products')
              .select('id, slug, updated_at')
              .eq('shop_id', shop.id)
              .eq('active', true),
            supabase
              .from('pages')
              .select('slug, updated_at, og_image, noindex')
              .eq('shop_id', shop.id)
              .eq('is_published', true),
          ])

          // Première photo de chaque produit (vitrine + aperçus de partage).
          const productIds = (products ?? []).map((p) => (p as { id: string }).id)
          let firstImageByProduct = new Map<string, string>()
          if (productIds.length > 0) {
            const { data: images } = await supabase
              .from('product_images')
              .select('product_id, public_url, sort_order')
              .in('product_id', productIds)
              .order('sort_order', { ascending: true })
            for (const img of (images ?? []) as { product_id: string; public_url: string }[]) {
              if (!firstImageByProduct.has(img.product_id)) firstImageByProduct.set(img.product_id, img.public_url)
            }
          }

          for (const product of (products ?? []) as { id: string; slug: string; updated_at: string }[]) {
            const image = firstImageByProduct.get(product.id)
            urls.push(
              urlEntry(`${origin}/produits/${product.slug}`, {
                lastmod: dateOnly(product.updated_at),
                changefreq: 'weekly',
                priority: '0.6',
                images: image ? [image] : undefined,
              }),
            )
          }
          for (const page of (pages ?? []) as { slug: string; updated_at: string; og_image: string | null; noindex: boolean }[]) {
            if (page.noindex) continue
            urls.push(
              urlEntry(`${origin}/pages/${page.slug}`, {
                lastmod: dateOnly(page.updated_at),
                changefreq: 'weekly',
                priority: '0.5',
                images: page.og_image ? [page.og_image] : undefined,
              }),
            )
          }
        }
      }
    } else {
      urls.push(urlEntry(`${origin}/`))
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}