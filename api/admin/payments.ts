import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPlatformAdminFromAuthHeader, getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { sendEmail } from '../_lib/resendEmail.js'
import { proActivatedEmailHtml } from '../_lib/emailTemplates.js'
import { PLANS } from '../../src/config/plans.js'

const SUBSCRIPTION_PERIOD_DAYS = 30

/** Single deployment of the three platform super-admin endpoints
 * (pending-payments / approve-payment / reject-payment), dispatched via the
 * vercel.json rewrites — kept at one serverless function to stay under the
 * Hobby plan's function limit. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === 'string' ? req.query.action : ''
  if (action === 'pending') return handlePending(req, res)
  if (action === 'approve') return handleApprove(req, res)
  if (action === 'reject') return handleReject(req, res)
  res.status(404).json({ error: 'Action inconnue.' })
}

async function handlePending(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const admin = await getPlatformAdminFromAuthHeader(req.headers.authorization)
    if (!admin) {
      res.status(403).json({ error: 'Accès réservé.' })
      return
    }

    const supabase = getSupabaseAdmin()
    const { data: payments, error } = await supabase
      .from('wave_payments')
      .select('id, shop_id, plan, amount, currency, client_reference, created_at, shop:shops(name, slug, whatsapp_number, owner_id)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw error

    const enriched = await Promise.all(
      (payments ?? []).map(async (payment) => {
        const shop = payment.shop as unknown as {
          name: string
          slug: string
          whatsapp_number: string
          owner_id: string
        } | null
        let ownerEmail: string | null = null
        if (shop?.owner_id) {
          const { data } = await supabase.auth.admin.getUserById(shop.owner_id)
          ownerEmail = data.user?.email ?? null
        }
        return { ...payment, shop, ownerEmail }
      }),
    )

    res.status(200).json({ payments: enriched })
  } catch (err) {
    console.error('admin pending-payments failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

/** Manual counterpart to settlePaymentFromWaveSession for the Wave manual-bridge payments (see api/request-pro-upgrade.ts). */
async function handleApprove(req: VercelRequest, res: VercelResponse) {
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
          subject: `Bienvenue dans Bitiko ${PLANS[payment.plan as keyof typeof PLANS].label} — ${shop.name}`,
          html: proActivatedEmailHtml({
            origin,
            shopName: shop.name,
            periodEndLabel: new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
            planLabel: PLANS[payment.plan as keyof typeof PLANS].label,
          }),
        })
      }
    } catch (emailErr) {
      console.error('admin approve-payment: confirmation email failed', emailErr)
    }

    res.status(200).json({ status: 'succeeded' })
  } catch (err) {
    console.error('admin approve-payment failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

/** For a claimed payment that never actually shows up in Wave's transaction list. */
async function handleReject(req: VercelRequest, res: VercelResponse) {
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
    const { error } = await supabase.from('wave_payments').update({ status: 'failed' }).eq('id', paymentId)
    if (error) throw error

    res.status(200).json({ status: 'failed' })
  } catch (err) {
    console.error('admin reject-payment failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}