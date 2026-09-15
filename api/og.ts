import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const ROOT_DOMAIN = process.env.VITE_ROOT_DOMAIN
const FALLBACK_CURRENCY = 'XOF'

function formatPrice(amount: number, currency: string | null | undefined): string {
  const code = currency && /^[A-Z]{3}$/i.test(currency) ? currency.toUpperCase() : FALLBACK_CURRENCY
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' ' + code
  }
}

/**
 * Link-preview crawlers (WhatsApp, Facebook, Twitter/X, Slack, Telegram,
 * LinkedIn, Discord) don't execute JavaScript, so they only ever see the
 * static tags baked into index.html — always the generic "Bitiko" ones,
 * never the shared product's real name/price/photo. Googlebot is
 * deliberately excluded: it renders JS and already gets accurate per-page
 * tags from usePageSeo, plus the full page content this function doesn't
 * reproduce.
 */
const BOT_PATTERN =
  /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot|SkypeUriPreview|Pinterest/i

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = (req.headers.host ?? '').split(':')[0]
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${host}`
  const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
  const userAgent = req.headers['user-agent'] ?? ''

  // Real visitors (and Googlebot) get the exact same SPA everyone else gets —
  // fetch the deployed index.html and hand it back unchanged so React Router
  // takes over client-side, same as if this rewrite didn't exist.
  if (!BOT_PATTERN.test(userAgent)) {
    const spa = await fetch(`${origin}/index.html`)
    const body = await spa.text()
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(spa.status).send(body)
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const pageUrl = `${origin}/produits/${slug}`

  const fallback = () => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(
      [
        '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
        '<title>Bitiko</title>',
        '<meta property="og:title" content="Bitiko">',
        '<meta property="og:description" content="Crée ta boutique en ligne et reçois tes commandes directement sur WhatsApp.">',
        `<meta property="og:url" content="${htmlEscape(pageUrl)}">`,
        '</head><body></body></html>',
      ].join(''),
    )
  }

  if (!supabaseUrl || !supabaseAnonKey || !slug) {
    fallback()
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const isSubdomain = !!ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)
  const shopSlug = isSubdomain ? host.slice(0, -(ROOT_DOMAIN!.length + 1)) : null

  const { data: shop } = (await (shopSlug
    ? supabase.from('shops').select('id, name, currency').ilike('slug', shopSlug).maybeSingle()
    : supabase.from('shops').select('id, name, currency').ilike('custom_domain', host).maybeSingle())) as {
    data: { id: string; name: string; currency: string | null } | null
  }
  if (!shop) {
    fallback()
    return
  }

  const { data: product } = await supabase
    .from('products')
    .select('name, description, price, images:product_images(public_url, sort_order)')
    .eq('shop_id', shop.id)
    .eq('slug', slug)
    .eq('active', true)
    .order('sort_order', { foreignTable: 'product_images', ascending: true })
    .maybeSingle()

  if (!product) {
    fallback()
    return
  }

  const images = (product.images as { public_url: string }[] | null) ?? []
  const image = images[0]?.public_url
  const title = `${product.name} — ${shop.name}`
  const description =
    (product.description as string | null)?.slice(0, 200) || `Disponible sur ${shop.name}, commandez directement sur WhatsApp.`
  const price = formatPrice(Number(product.price), shop.currency)

  const html = [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
    `<title>${htmlEscape(title)}</title>`,
    `<meta name="description" content="${htmlEscape(description)}">`,
    '<meta property="og:type" content="product">',
    `<meta property="og:title" content="${htmlEscape(title)}">`,
    `<meta property="og:description" content="${htmlEscape(description)} — ${htmlEscape(price)}">`,
    `<meta property="og:url" content="${htmlEscape(pageUrl)}">`,
    image ? `<meta property="og:image" content="${htmlEscape(image)}">` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta property="product:price:amount" content="' + String(product.price) + '">',
    `<meta property="product:price:currency" content="${htmlEscape(shop.currency ?? 'XOF')}">`,
    '</head><body></body></html>',
  ].join('')

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400')
  res.status(200).send(html)
}
