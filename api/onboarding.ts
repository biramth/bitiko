import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendEmail } from './_lib/resendEmail.js'
import { bookingNotificationEmailHtml, automatedEmailHtml } from './_lib/emailTemplates.js'
import { getAutomatedEmail } from './_lib/automatedEmails.js'
import { dispatchEvents } from './_lib/automationDispatch.js'
import { isValidUnsubscribeToken } from './_lib/unsubscribeToken.js'

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
 * auth.users via the email_account_status() SECURITY DEFINER function, which
 * has no execute grant for anon/authenticated — only reachable here, with
 * the service_role key. The status also lets the UI send an unconfirmed
 * account to a resend step (instead of a login form it can't get past).
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

  const { data, error } = await admin.rpc('email_account_status', { p_email: normalizedEmail })
  if (error) throw error
  const status = typeof data === 'string' ? data : 'none'
  res.status(200).json({ status, exists: status !== 'none' })
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

  // Email de bienvenue personnalisable depuis /plateforme/campagnes ; un email
  // désactivé par l'équipe n'est tout simplement pas envoyé.
  const template = await getAutomatedEmail(admin, 'welcome')
  if (template && !template.is_enabled) {
    res.status(200).json({ sent: false })
    return
  }
  const ownerName =
    (userData.user.user_metadata?.full_name as string | undefined)?.trim() ||
    userData.user.email.split('@')[0]
  const { subject, html } = automatedEmailHtml({
    key: 'welcome',
    origin: platformOrigin,
    vars: { shopName: shop.name, shopUrl, ownerName },
    override: template,
  })

  await sendEmail({ to: userData.user.email, subject, html })

  res.status(200).json({ sent: true })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Une demande n'est notifiable que juste après sa création : l'endpoint est
 *  public (le visiteur n'a aucun compte), il ne doit pas servir à rejouer
 *  d'anciens rendez-vous. */
const BOOKING_NOTIFY_WINDOW_MS = 10 * 60 * 1000

/**
 * Prévient le commerçant (email) d'une nouvelle demande de rendez-vous ou de
 * réservation. Appelé sans authentification par la vitrine juste après la prise
 * de réservation : la demande existe déjà en base (RPC durcies), cette route
 * ne fait qu'envoyer UN email — `owner_notified_at` est posé atomiquement, donc
 * un second appel (ou un rejeu) ne renvoie rien.
 */
async function handleBookingNotify(req: VercelRequest, res: VercelResponse) {
  const { kind, id } = req.body ?? {}
  if ((kind !== 'appointment' && kind !== 'reservation') || typeof id !== 'string' || !UUID_RE.test(id)) {
    res.status(400).json({ error: 'Demande invalide.' })
    return
  }

  const admin = getSupabaseAdmin()
  const table = kind === 'appointment' ? 'appointments' : 'reservations'
  const since = new Date(Date.now() - BOOKING_NOTIFY_WINDOW_MS).toISOString()
  const { data: claimed, error } = await admin
    .from(table)
    .update({ owner_notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('owner_notified_at', null)
    .gt('created_at', since)
    .select('*')
  if (error) throw error
  const booking = claimed?.[0] as
    | {
        shop_id: string
        customer_name: string
        customer_phone: string
        start_at: string
        service_name?: string | null
        party_size?: number
      }
    | undefined
  if (!booking) {
    res.status(200).json({ sent: false })
    return
  }

  const { data: shop } = await admin.from('shops').select('name, owner_id').eq('id', booking.shop_id).maybeSingle()
  if (!shop) {
    res.status(200).json({ sent: false })
    return
  }
  const { data: ownerData } = await admin.auth.admin.getUserById(shop.owner_id as string)
  const to = ownerData.user?.email
  if (!to) {
    res.status(200).json({ sent: false })
    return
  }
  const { data: settings } = await admin
    .from('booking_settings')
    .select('timezone')
    .eq('shop_id', booking.shop_id)
    .maybeSingle()
  const timeZone = (settings?.timezone as string | undefined) ?? 'Africa/Dakar'
  const whenLabel = new Date(booking.start_at).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
  const rootDomain = process.env.VITE_ROOT_DOMAIN
  const origin = rootDomain ? `https://${rootDomain}` : 'https://bitiko.shop'

  await sendEmail({
    to,
    subject: `${kind === 'appointment' ? 'Nouveau rendez-vous' : 'Nouvelle réservation'} — ${shop.name as string}`,
    html: bookingNotificationEmailHtml({
      origin,
      shopName: shop.name as string,
      kind,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      whenLabel,
      detail: kind === 'appointment' ? (booking.service_name ?? 'Prestation') : `Table pour ${booking.party_size ?? '?'}`,
    }),
  })
  res.status(200).json({ sent: true })
}

/**
 * Déclenche tout de suite le moteur d'automatisation pour UNE boutique (appelé
 * par la vitrine après une commande ou une réservation), sans attendre le cron
 * quotidien. Public mais inoffensif : il n'exécute que les règles activées par
 * le propriétaire sur des événements non traités de cette boutique, et un
 * événement n'est jamais traité deux fois (`processed`).
 */
async function handleAutomationKick(req: VercelRequest, res: VercelResponse) {
  const { shopId } = req.body ?? {}
  if (typeof shopId !== 'string' || !UUID_RE.test(shopId)) {
    res.status(400).json({ error: 'Boutique invalide.' })
    return
  }
  const result = await dispatchEvents(getSupabaseAdmin(), { shopId, limit: 20 })
  res.status(200).json(result)
}

function unsubscribePage(message: string, ok: boolean): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Désabonnement — Bitiko</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f3ead9;font-family:Arial,Helvetica,sans-serif;padding:24px}
.card{max-width:420px;background:#fff;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 10px 30px rgba(34,31,69,.08)}
h1{font-size:18px;color:#221f45;margin:0 0 8px}p{font-size:14px;color:#5b5686;line-height:1.6;margin:0}
.mark{width:48px;height:48px;border-radius:12px;background:#221f45;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-family:Arial,sans-serif}</style>
</head><body><div class="card"><div class="mark">B</div><h1>${ok ? 'Désabonnement confirmé' : 'Lien invalide'}</h1><p>${message}</p></div></body></html>`
}

/**
 * Un clic (ou le bouton « Se désabonner » d'une boîte mail, RFC 8058 —
 * requête POST automatique) retire le compte des campagnes email (promos,
 * annonces). N'affecte jamais les emails transactionnels (bienvenue,
 * abonnement activé, rappel d'échéance), déclenchés par l'action du
 * destinataire, pas par une campagne. Public par nature : cliqué depuis une
 * boîte mail, jamais connecté — le jeton signé (api/_lib/unsubscribeToken.ts)
 * est la seule protection contre le désabonnement d'un autre compte.
 */
async function handleCampaignUnsubscribe(req: VercelRequest, res: VercelResponse) {
  const userId = typeof req.query.u === 'string' ? req.query.u : ''
  const token = typeof req.query.t === 'string' ? req.query.t : ''

  if (!UUID_RE.test(userId) || !token || !isValidUnsubscribeToken(userId, token)) {
    if (req.method === 'POST') {
      res.status(400).json({ error: 'Lien invalide.' })
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.status(400).send(unsubscribePage('Ce lien de désabonnement est invalide ou a expiré.', false))
    }
    return
  }

  const { error } = await getSupabaseAdmin()
    .from('campaign_unsubscribes')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (error) throw error

  if (req.method === 'POST') {
    // Gmail/Yahoo/Outlook (List-Unsubscribe-Post) n'attendent aucun corps.
    res.status(200).end()
    return
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(unsubscribePage('Tu ne recevras plus les emails de campagne (promos, annonces) de Bitiko. Les emails liés à ton compte (bienvenue, abonnement, rappels) continuent normalement.', true))
}

/**
 * Onboarding-time endpoint (check-email + welcome email), consolidated into
 * one function to stay under the Hobby plan's function limit — the rewrites
 * in vercel.json map the readable URLs onto `?action=`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === 'string' ? req.query.action : 'check-email'

  // Seul le désabonnement est atteint depuis un lien d'email (GET) ou par le
  // clic en un geste d'un client mail (POST sans JSON) — tout le reste de cet
  // endpoint reste POST-only, appelé depuis l'application.
  if (action === 'unsubscribe') {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    try {
      await handleCampaignUnsubscribe(req, res)
    } catch (err) {
      console.error('campaign-unsubscribe failed', err)
      res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
    }
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    switch (action) {
      case 'welcome':
        await handleSendWelcomeEmail(req, res)
        return
      case 'booking-notify':
        await handleBookingNotify(req, res)
        return
      case 'automation-kick':
        await handleAutomationKick(req, res)
        return
      default:
        await handleCheckEmail(req, res)
    }
  } catch (err) {
    console.error('onboarding endpoint failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
