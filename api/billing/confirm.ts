import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertShopOwner, getSupabaseAdmin, getUserIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { getWaveCheckoutSession } from '../_lib/wave.js'
import { settlePaymentFromWaveSession } from '../_lib/settlePayment.js'

/**
 * Called by the billing page right after the customer returns from Wave.
 * Reads the payment's true status straight from Wave (GET, not a webhook) so
 * the merchant sees "Pro activé" within seconds, whether or not the Wave
 * Business Portal's webhook feature is enabled for this account yet.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const userId = await getUserIdFromAuthHeader(req.headers.authorization)
    if (!userId) {
      res.status(401).json({ error: 'Non authentifié.' })
      return
    }

    const { clientReference } = req.body ?? {}
    if (typeof clientReference !== 'string' || !clientReference) {
      res.status(400).json({ error: 'clientReference manquant.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: payment, error: paymentError } = await admin
      .from('wave_payments')
      .select('*')
      .eq('client_reference', clientReference)
      .maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) {
      res.status(404).json({ error: 'Paiement introuvable.' })
      return
    }

    const isOwner = await assertShopOwner(payment.shop_id, userId)
    if (!isOwner) {
      res.status(403).json({ error: 'Cette boutique ne vous appartient pas.' })
      return
    }

    if (payment.status === 'succeeded') {
      res.status(200).json({ status: 'succeeded' })
      return
    }
    if (!payment.wave_checkout_id) {
      res.status(200).json({ status: 'pending' })
      return
    }

    const session = await getWaveCheckoutSession(payment.wave_checkout_id)
    const result = await settlePaymentFromWaveSession(session)
    res.status(200).json({ status: result })
  } catch (err) {
    console.error('confirm failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
