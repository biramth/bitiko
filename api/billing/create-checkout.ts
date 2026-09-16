import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertShopOwner, getSupabaseAdmin, getUserIdFromAuthHeader } from '../_lib/supabaseAdmin.js'
import { createWaveCheckoutSession } from '../_lib/wave.js'
import { PLANS, type PlanKey } from '../../src/config/plans.js'

/**
 * Starts a Wave checkout for a shop's paid subscription. Only ever called
 * from the authenticated billing page — the actual plan/price come from our
 * own config, never from the request body, so a tampered request can't buy
 * a different amount than the real price.
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

    const { shopId, plan: requestedPlan } = req.body ?? {}
    if (typeof shopId !== 'string' || !shopId) {
      res.status(400).json({ error: 'shopId manquant.' })
      return
    }

    const isOwner = await assertShopOwner(shopId, userId)
    if (!isOwner) {
      res.status(403).json({ error: 'Cette boutique ne vous appartient pas.' })
      return
    }

    if (requestedPlan !== 'essential' && requestedPlan !== 'pro') {
      res.status(400).json({ error: 'Plan payant invalide.' })
      return
    }
    const planKey: Exclude<PlanKey, 'free'> = requestedPlan
    const plan = PLANS[planKey]
    const clientReference = `sub_${shopId}_${Date.now()}`
    const host = (req.headers.host ?? '').toString()
    const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
    const origin = `${proto}://${host}`

    // We generate client_reference ourselves *before* calling Wave, so it can
    // go straight into success_url — Wave's own session id doesn't exist yet
    // at this point, but the client_reference lets the billing page look the
    // payment row (and from it the wave_checkout_id) back up on return.
    const session = await createWaveCheckoutSession({
      amount: plan.priceXof,
      currency: 'XOF',
      clientReference,
      successUrl: `${origin}/admin/facturation?reference=${clientReference}`,
      errorUrl: `${origin}/admin/facturation?paiement=echec`,
    })

    const admin = getSupabaseAdmin()
    const { error: insertError } = await admin.from('wave_payments').insert({
      shop_id: shopId,
      plan: plan.key,
      amount: plan.priceXof,
      currency: 'XOF',
      client_reference: clientReference,
      wave_checkout_id: session.id,
      status: 'pending',
    })
    if (insertError) throw insertError

    res.status(200).json({ waveLaunchUrl: session.wave_launch_url })
  } catch (err) {
    console.error('create-checkout failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
