import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const ROOT_DOMAIN = process.env.VITE_ROOT_DOMAIN
const FALLBACK_CURRENCY = 'XOF'

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatPrice(amount: number, currency: string | null | undefined): string {
  const code = currency && /^[A-Z]{3}$/i.test(currency) ? currency.toUpperCase() : FALLBACK_CURRENCY
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' ' + code
  }
}

function page(title: string, description: string, url: string, image?: string | null): string {
  return [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
    `<title>${htmlEscape(title)}</title>`,
    `<meta name="description" content="${htmlEscape(description)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Bitiko">',
    '<meta property="og:locale" content="fr_FR">',
    `<meta property="og:title" content="${htmlEscape(title)}">`,
    `<meta property="og:description" content="${htmlEscape(description)}">`,
    `<meta property="og:url" content="${xmlEscape(url)}">`,
    image ? `<meta property="og:image" content="${xmlEscape(image)}">` : '',
    image ? '<meta name="twitter:card" content="summary_large_image">' : '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${htmlEscape(title)}">`,
    `<meta name="twitter:description" content="${htmlEscape(description)}">`,
    image ? `<meta name="twitter:image" content="${xmlEscape(image)}">` : '',
    '</head><body></body></html>',
  ].join('')
}

function isPlatformHost(host: string): boolean {
  return !ROOT_DOMAIN || host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`
}

/**
 * Dynamic link-preview tags, reached via the edge middleware when a
 * link-preview bot requests a real storefront URL. Googlebot is deliberately
 * excluded (it renders JS and gets accurate per-page tags + content from
 * usePageSeo), as are real visitors, so this only ever serves tiny metadata
 * pages to preview crawlers.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = (req.headers.host ?? '').split(':')[0]
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${host}`

  const userAgent = req.headers['user-agent'] ?? ''
  // Should not happen (middleware gates this), but if a non-bot ever lands
  // here, give it the real SPA instead of a bare metadata shell.
  const isBot = /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot|SkypeUriPreview|Pinterest/i.test(
    userAgent,
  )
  if (!isBot) {
    const spa = await fetch(`${origin}/index.html`)
    const body = await spa.text()
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(spa.status).send(body)
    return
  }

  const path = typeof req.query.path === 'string' ? req.query.path : '/'

  if (isPlatformHost(host)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(
      page(
        'Bitiko — Crée ta boutique en ligne, vends sur WhatsApp',
        "Bitiko te donne une vraie boutique en ligne — catalogue, panier, commandes — et relaie tes ventes directement sur WhatsApp. Fait pour l'Afrique, gratuit pour commencer.",
        `${origin}/`,
        `${origin}/og-cover.png`,
      ),
    )
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  const fallback = () => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(
      page('Bitiko', 'Crée ta boutique en ligne et reçois tes commandes directement sur WhatsApp.', `${origin}/`),
    )
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    fallback()
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const isSubdomain = !!ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)

  if (!isSubdomain) {
    fallback()
    return
  }
  const shopSlug = host.slice(0, -(ROOT_DOMAIN!.length + 1))

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, description, currency, logo_url, banner_url')
    .ilike('slug', shopSlug)
    .maybeSingle()

  if (!shop) {
    fallback()
    return
  }

  const shopImage = shop.banner_url ?? shop.logo_url
  const shopDescription = shop.description || `Découvre ${shop.name} et commande directement sur WhatsApp.`

  // ── Custom page (About, FAQ, Contact…) ────────────────────────────────
  if (path.startsWith('/pages/')) {
    const pageSlug = path.slice('/pages/'.length).replace(/\/$/, '')
    const { data: pageData } = await supabase
      .from('pages')
      .select('title, seo_title, seo_description')
      .eq('shop_id', shop.id)
      .eq('slug', pageSlug)
      .eq('is_published', true)
      .maybeSingle()

    if (pageData) {
      const title = pageData.seo_title || pageData.title || shop.name
      const description = pageData.seo_description || shopDescription
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
      res.status(200).send(page(title, description, `${origin}/pages/${pageSlug}`, shopImage))
      return
    }
  }

  // ── Product ───────────────────────────────────────────────────────────
  if (path.startsWith('/produits/')) {
    const slug = path.slice('/produits/'.length).replace(/\/$/, '')
    if (slug) {
      const { data: product } = await supabase
        .from('products')
        .select('name, description, price, images:product_images(public_url, sort_order)')
        .eq('shop_id', shop.id)
        .eq('slug', slug)
        .eq('active', true)
        .order('sort_order', { foreignTable: 'product_images', ascending: true })
        .maybeSingle()

      if (product) {
        const images = (product.images as { public_url: string }[] | null) ?? []
        const image = images[0]?.public_url
        const title = `${product.name} — ${shop.name}`
        const description =
          (product.description as string | null)?.slice(0, 200) || shopDescription
        const price = formatPrice(Number(product.price), shop.currency) ?? ''
        const body = [
          '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
          `<title>${htmlEscape(title)}</title>`,
          `<meta name="description" content="${htmlEscape(description)}">`,
          '<meta property="og:type" content="product">',
          '<meta property="og:site_name" content="Bitiko">',
          '<meta property="og:locale" content="fr_FR">',
          `<meta property="og:title" content="${htmlEscape(title)}">`,
          `<meta property="og:description" content="${htmlEscape(description)} — ${htmlEscape(price)}">`,
          `<meta property="og:url" content="${xmlEscape(`${origin}/produits/${slug}`)}">`,
          image ? `<meta property="og:image" content="${xmlEscape(image)}">` : '',
          `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
          `<meta name="twitter:title" content="${htmlEscape(title)}">`,
          `<meta name="twitter:description" content="${htmlEscape(description)} — ${htmlEscape(price)}">`,
          image ? `<meta name="twitter:image" content="${xmlEscape(image)}">` : '',
          `<meta property="product:price:amount" content="${String(product.price)}">`,
          `<meta property="product:price:currency" content="${htmlEscape(shop.currency ?? 'XOF')}">`,
          '</head><body></body></html>',
        ].join('')
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400')
        res.status(200).send(body)
        return
      }
    }
  }

  // ── Shop home & catalogue: name, description, banner/logo ─────────────
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(page(`${shop.name} — Boutique en ligne`, shopDescription, `${origin}/`, shopImage))
}