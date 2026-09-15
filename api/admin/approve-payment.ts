import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPlatformAdminFromAuthHeader, getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { sendEmail } from '../_lib/resendEmail.js'
import { proActivatedEmailHtml } from '../_lib/emailTemplates.js'

const SUBSCRIPTION_PERIOD_DAYS = 30

/** Manual counterpart to settlePaymentFromWaveSession.ts for the Wave manual-bridge payments (see api/request-pro-upgrade.ts). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const admin = await getPlatformAdminFromAuthHeader(req.headers.authorization)
    if (!admin) {
      res.status(403).json({ error: 'Accès réservé.' })
      return
    }

    const { paymentId } = req.body ?? {}
    if (typeof paymentId !== 'string' || !paymentId) {
      res.status(400).json({ error: 'paymentId manquant.' })
      return
    }

    const supabase = getSupabaseAdmin()
    const { data: payment, error: paymentError } = await supabase
      .from('wave_payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) {
      res.status(404).json({ error: 'Paiement introuvable.' })
      return
    }
    if (payment.status === 'succeeded') {
      res.status(200).json({ status: 'succeeded' })
      return
    }

    const periodEnd = new Date(Date.now() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { error: updatePaymentError } = await supabase
      .from('wave_payments')
      .update({ status: 'succeeded', completed_at: new Date().toISOString() })
      .eq('id', paymentId)
    if (updatePaymentError) throw updatePaymentError

    const { error: upsertSubError } = await supabase
      .from('shop_subscriptions')
      .upsert(
        { shop_id: payment.shop_id, plan: payment.plan, status: 'active', current_period_end: periodEnd },
        { onConflict: 'shop_id' },
      )
    if (upsertSubError) throw upsertSubError

    try {
      const { data: shop } = await supabase.from('shops').select('name, owner_id').eq('id', payment.shop_id).maybeSingle()
      const ownerId = shop?.owner_id
      const { data: ownerData } = ownerId ? await supabase.auth.admin.getUserById(ownerId) : { data: { user: null } }
      const rootDomain = process.env.VITE_ROOT_DOMAIN
      const origin = rootDomain ? `https://${rootDomain}` : `${(req.headers['x-forwarded-proto'] as string) ?? 'https'}://${req.headers.host}`
      if (shop && ownerData.user?.email) {
        await sendEmail({
          to: ownerData.user.email,
          subject: `Bienvenue dans Bitiko Pro — ${shop.name}`,
          html: proActivatedEmailHtml({
            origin,
            shopName: shop.name,
            periodEndLabel: new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
          }),
        })
      }
    } catch (emailErr) {
      console.error('approve-payment: confirmation email failed', emailErr)
    }

    res.status(200).json({ status: 'succeeded' })
  } catch (err) {
    console.error('approve-payment failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
