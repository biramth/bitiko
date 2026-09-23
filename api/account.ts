import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin, getUserIdFromAuthHeader } from './_lib/supabaseAdmin.js'
import { deleteUserCompletely } from './_lib/userDeletion.js'
import { sendEmail } from './_lib/resendEmail.js'
import { proUpgradeRequestEmailHtml } from './_lib/emailTemplates.js'
import { PLANS, type PlanKey } from '../src/config/plans.js'

const ADMIN_EMAIL = 'papebiramethiombanee@gmail.com'

/**
 * Account-level serverless endpoint (account deletion + manual pro upgrade
 * request), consolidated into one function to stay under the Hobby plan's
 * function limit — the vercel.json rewrites map the readable URLs onto
 * `?action=`. Both actions act on the authenticated caller's own account.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === 'string' ? req.query.action : ''

  switch (action) {
    case 'delete':
      return handleDeleteAccount(req, res)
    case 'upgrade':
      return handleRequestProUpgrade(req, res)
    default:
      res.status(404).json({ error: 'Action inconnue.' })
  }
}

/** Permanently deletes the caller's account — see deleteUserCompletely() in
 *  _lib/userDeletion.ts for the scope of what's removed. Irreversible; the
 *  confirmation UX lives in AccountSection. */
async function handleDeleteAccount(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userId = await getUserIdFromAuthHeader(req.headers.authorization)
  if (!userId) {
    res.status(401).json({ error: 'Non authentifié.' })
    return
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: user } = await admin.auth.admin.getUserById(userId)
    await deleteUserCompletely(admin, userId, user.user?.email)

    res.status(200).json({ deleted: true })
  } catch (err) {
    console.error('delete-account failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}

/**
 * Manual bridge while Wave's Checkout API isn't available yet (see
 * src/config/plans.ts's WAVE_PRO_PAYMENT_LINK): records a pending payment
 * row — same table and shape a real Wave webhook would write — and emails
 * the admin to verify and activate it by hand. Replace with the real
 * checkout flow once Wave grants API access; existing pending rows stay
 * valid either way.
 */
async function handleRequestProUpgrade(req: VercelRequest, res: VercelResponse) {
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

    const { shopId, plan: requestedPlan } = req.body ?? {}
    if (typeof shopId !== 'string' || !shopId) {
      res.status(400).json({ error: 'shopId manquant.' })
      return
    }

    if (requestedPlan !== 'essential' && requestedPlan !== 'pro') {
      res.status(400).json({ error: 'Plan payant invalide.' })
      return
    }
    const planKey: Exclude<PlanKey, 'free'> = requestedPlan
    const plan = PLANS[planKey]

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

    // Proof of payment: a screenshot the merchant already uploaded to the private
    // `payment-proofs` bucket under "<shopId>/" (storage RLS enforces ownership),
    // plus optionally the Wave transaction reference and the paying number.
    const { proofPath, payerPhone, transactionRef } = req.body ?? {}
    if (
      typeof proofPath !== 'string' ||
      !proofPath.startsWith(`${shopId}/`) ||
      proofPath.includes('..') ||
      proofPath.length > 200
    ) {
      res.status(400).json({ error: 'Ajoutez la capture de votre paiement.' })
      return
    }
    const proofFile = proofPath.slice(shopId.length + 1)
    const { data: uploaded } = await admin.storage.from('payment-proofs').list(shopId, { search: proofFile })
    if (!uploaded?.some((f) => f.name === proofFile)) {
      res.status(400).json({ error: 'Capture introuvable — renvoyez-la.' })
      return
    }
    const cleanRef = typeof transactionRef === 'string' ? transactionRef.trim() : ''
    if (cleanRef && !/^[A-Za-z0-9_-]{4,64}$/.test(cleanRef)) {
      res.status(400).json({ error: 'Référence de transaction invalide.' })
      return
    }
    const cleanPhone = typeof payerPhone === 'string' ? payerPhone.trim().slice(0, 30) : ''

    const proofFields = {
      proof_path: proofPath,
      transaction_ref: cleanRef || null,
      payer_phone: cleanPhone || null,
      proof_submitted_at: new Date().toISOString(),
      rejection_reason: null,
    }

    const { data: existingPending } = await admin
      .from('wave_payments')
      .select('id')
      .eq('shop_id', shopId)
      .eq('status', 'pending')
      .like('client_reference', 'manual_%')
      .maybeSingle()

    const { error: saveError } = existingPending
      ? await admin.from('wave_payments').update({ ...proofFields, plan: plan.key, amount: plan.priceXof }).eq('id', existingPending.id)
      : await admin.from('wave_payments').insert({
          shop_id: shopId,
          plan: plan.key,
          amount: plan.priceXof,
          currency: 'XOF',
          client_reference: `manual_${shopId}_${Date.now()}`,
          status: 'pending',
          ...proofFields,
        })
    if (saveError) {
      if (saveError.code === '23505') {
        res.status(409).json({ error: 'Cette référence de transaction a déjà été utilisée.' })
        return
      }
      throw saveError
    }

    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `Demande de passage ${plan.label} — ${shop.name}`,
        html: proUpgradeRequestEmailHtml({
          shopName: shop.name,
          shopSlug: shop.slug,
          whatsappNumber: shop.whatsapp_number,
          ownerEmail: userData.user.email,
          amount: plan.priceXof,
          planLabel: plan.label,
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
