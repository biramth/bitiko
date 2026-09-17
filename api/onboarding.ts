import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendEmail } from './_lib/resendEmail.js'
import { welcomeEmailHtml } from './_lib/emailTemplates.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Verifies a Cloudflare Turnstile token server-side. Skipped entirely (returns
 * true) when TURNSTILE_SECRET_KEY isn't set, so the endpoint behaves the same
 * with or without Turnstile configured — the Postgres rate limit below is the
 * actual security control either way, this is extra bot-friction on top.
 */
async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    })
    const body = (await res.json()) as { success: boolean }
    return body.success === true
  } catch (err) {
    console.error('turnstile verification failed', err)
    return false
  }
}

/**
 * Powers the "email first" login/signup flow: tells the client whether to
 * reveal a password field (existing account) or a signup form (new email),
 * instead of the merchant having to guess which page to land on. Reads
 * auth.users via the email_has_account() SECURITY DEFINER function, which
 * has no execute grant for anon/authenticated — only reachable here, with
 * the service_role key.
 *
 * This endpoint is a genuine email-enumeration oracle by design (same
 * signal SignupPage's "Un compte existe déjà" already gave, just moved
 * earlier in the flow) — check_email_rate_limit() caps it at 5 checks/hour
 * per email and 30/hour per IP, persisted in Postgres so it survives cold
 * starts and can't be reset by hitting a fresh serverless instance. Turnstile
 * adds bot-friction on top of that, once configured.
 */
async function handleCheckEmail(req: VercelRequest, res: VercelResponse) {
  const { email, turnstileToken } = req.body ?? {}
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Email invalide.' })
    return
  }
  const normalizedEmail = email.trim().toLowerCase()
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

  const turnstileOk = await verifyTurnstile(typeof turnstileToken === 'string' ? turnstileToken : null, ip)
  if (!turnstileOk) {
    res.status(403).json({ error: 'Vérification anti-robot échouée, réessaie.' })
    return
  }

  const admin = getSupabaseAdmin()

  const { data: allowed, error: rateLimitError } = await admin.rpc('check_email_rate_limit', {
    p_email: normalizedEmail,
    p_ip: ip,
  })
  if (rateLimitError) throw rateLimitError
  if (!allowed) {
    res.status(429).json({ error: 'Trop de tentatives, réessaie plus tard.' })
    return
  }

  const { data, error } = await admin.rpc('email_has_account', { p_email: normalizedEmail })
  if (error) throw error
  res.status(200).json({ exists: !!data })
}

/**
 * Fired once, right after onboarding creates a shop. The recipient email
 * comes from the authenticated user's own account (never from the request
 * body) so this can't be used to spam an arbitrary address, and a failure
 * here is logged but never surfaced as an onboarding error — the shop
 * already exists either way.
 */
async function handleSendWelcomeEmail(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ error: 'Non authentifié.' })
    return
  }

  const admin = getSupabaseAdmin()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user?.email) {
    res.status(401).json({ error: 'Non authentifié.' })
    return
  }

  const { shopId } = req.body ?? {}
  if (typeof shopId !== 'string' || !shopId) {
    res.status(400).json({ error: 'shopId manquant.' })
    return
  }

  const { data: shop, error: shopError } = await admin
    .from('shops')
    .select('id, name, slug, owner_id')
    .eq('id', shopId)
    .maybeSingle()
  if (shopError) throw shopError
  if (!shop || shop.owner_id !== userData.user.id) {
    res.status(403).json({ error: 'Cette boutique ne vous appartient pas.' })
    return
  }

  const rootDomain = process.env.VITE_ROOT_DOMAIN
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const platformOrigin = rootDomain ? `https://${rootDomain}` : `${proto}://${req.headers.host}`
  const shopUrl = rootDomain ? `https://${shop.slug}.${rootDomain}` : platformOrigin

  await sendEmail({
    to: userData.user.email,
    subject: `${shop.name} est en ligne — Bitiko`,
    html: welcomeEmailHtml({
      origin: platformOrigin,
      shopName: shop.name,
      shopUrl,
      addProductUrl: `${platformOrigin}/admin/produits/nouveau`,
    }),
  })

  res.status(200).json({ sent: true })
}

/**
 * Onboarding-time endpoint (check-email + welcome email), consolidated into
 * one function to stay under the Hobby plan's function limit — the rewrites
 * in vercel.json map the readable URLs onto `?action=`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const action = typeof req.query.action === 'string' ? req.query.action : 'check-email'

  try {
    switch (action) {
      case 'welcome':
        await handleSendWelcomeEmail(req, res)
        return
      default:
        await handleCheckEmail(req, res)
    }
  } catch (err) {
    console.error('onboarding endpoint failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
