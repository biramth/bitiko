import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendEmail } from './_lib/resendEmail.js'
import { proUpgradeRequestEmailHtml } from './_lib/emailTemplates.js'
import { PLANS } from '../src/config/plans.js'

const ADMIN_EMAIL = 'papebiramethiombanee@gmail.com'

/**
 * Manual bridge while Wave's Checkout API isn't available yet (see
 * src/config/plans.ts's WAVE_PRO_PAYMENT_LINK): records a pending payment
 * row — same table and shape a real Wave webhook would write — and emails
 * the admin to verify and activate it by hand. Replace with the real
 * checkout flow once Wave grants API access; existing pending rows stay
 * valid either way.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
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
      .select('id, name, slug, whatsapp_number, owner_id')
      .eq('id', shopId)
      .maybeSingle()
    if (shopError) throw shopError
    if (!shop || shop.owner_id !== userData.user.id) {
      res.status(403).json({ error: 'Cette boutique ne vous appartient pas.' })
      return
    }

    const { data: existingPending } = await admin
      .from('wave_payments')
      .select('id')
      .eq('shop_id', shopId)
      .eq('status', 'pending')
      .like('client_reference', 'manual_%')
      .maybeSingle()

    if (!existingPending) {
      const { error: insertError } = await admin.from('wave_payments').insert({
        shop_id: shopId,
        plan: 'pro',
        amount: PLANS.pro.priceXof,
        currency: 'XOF',
        client_reference: `manual_${shopId}_${Date.now()}`,
        status: 'pending',
      })
      if (insertError) throw insertError
    }

    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `Demande de passage Pro — ${shop.name}`,
        html: proUpgradeRequestEmailHtml({
          shopName: shop.name,
          shopSlug: shop.slug,
          whatsappNumber: shop.whatsapp_number,
          ownerEmail: userData.user.email,
          amount: PLANS.pro.priceXof,
        }),
      })
    } catch (emailErr) {
      // The pending payment row above is the part that actually matters — it's
      // what the admin checks against Wave's transaction list either way. A
      // failed notification email shouldn't block the merchant's request.
      console.error('request-pro-upgrade: notification email failed', emailErr)
    }

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('request-pro-upgrade failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
