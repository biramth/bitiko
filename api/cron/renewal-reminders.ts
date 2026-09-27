import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { sendEmail } from '../_lib/resendEmail.js'
import { isCronAuthorized } from '../_lib/cronAuth.js'
import { automatedEmailHtml } from '../_lib/emailTemplates.js'
import { getAutomatedEmail } from '../_lib/automatedEmails.js'
import { PLANS } from '../../src/config/plans.js'

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
 * Runs daily (see vercel.json's `crons`). There's no auto-renewal on this
 * manual Wave-payment bridge (api/account.ts) — a Pro shop
 * silently reverts to free the instant current_period_end passes (see
 * effectivePlanKey in src/config/plans.ts) unless someone pays again first.
 * This nudges merchants 2-3 days ahead. The window matches the daily cron
 * cadence — one send per shop per expiry, no extra tracking column needed.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req.headers.authorization)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const admin = getSupabaseAdmin()
    const windowStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    const windowEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const { data: subscriptions, error } = await admin
      .from('shop_subscriptions')
      .select('shop_id, plan, current_period_end, shop:shops(name, slug, currency, owner_id)')
      .in('plan', ['essential', 'pro'])
      .eq('status', 'active')
      .gte('current_period_end', windowStart)
      .lt('current_period_end', windowEnd)
    if (error) throw error

    const rootDomain = process.env.VITE_ROOT_DOMAIN
    const origin = rootDomain ? `https://${rootDomain}` : 'https://bitiko.shop'

    // Contenu éditable depuis /plateforme/campagnes ; désactivé = pas d'envoi.
    const template = await getAutomatedEmail(admin, 'renewal-reminder')
    if (template && !template.is_enabled) {
      res.status(200).json({ checked: 0, sent: 0, disabled: true })
      return
    }

    let sent = 0

    for (const sub of subscriptions ?? []) {
      const shop = sub.shop as unknown as { name: string; slug: string; currency: string | null; owner_id: string } | null
      if (!shop || !sub.current_period_end) continue

      const { data: ownerData } = await admin.auth.admin.getUserById(shop.owner_id)
      if (!ownerData.user?.email) continue

      try {
        const planLabel = PLANS[sub.plan as keyof typeof PLANS].label
        const shopUrl = rootDomain && shop.slug ? `https://${shop.slug}.${rootDomain}` : origin
        const { subject, html } = automatedEmailHtml({
          key: 'renewal-reminder',
          origin,
          vars: {
            shopName: shop.name,
            shopUrl,
            ownerName:
              (ownerData.user.user_metadata?.full_name as string | undefined)?.trim() ||
              ownerData.user.email.split('@')[0],
            planName: planLabel,
            periodEndLabel: new Date(sub.current_period_end).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
            amountLabel: formatPrice(PLANS[sub.plan as keyof typeof PLANS].priceXof, shop.currency),
          },
          override: template,
        })
        await sendEmail({ to: ownerData.user.email, subject, html })
        sent++
      } catch (emailErr) {
        console.error('renewal-reminders: send failed for shop', sub.shop_id, emailErr)
      }
    }

    res.status(200).json({ checked: subscriptions?.length ?? 0, sent })
  } catch (err) {
    console.error('renewal-reminders failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
