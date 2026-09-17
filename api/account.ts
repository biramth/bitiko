import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin, getUserIdFromAuthHeader } from './_lib/supabaseAdmin.js'
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

/** Empties every file under `<id>/` in a bucket — best-effort, logs and continues on failure. */
async function clearBucketFolder(admin: ReturnType<typeof getSupabaseAdmin>, bucket: string, folderId: string) {
  try {
    const { data: files } = await admin.storage.from(bucket).list(folderId)
    if (files?.length) {
      await admin.storage.from(bucket).remove(files.map((f) => `${folderId}/${f.name}`))
    }
  } catch (err) {
    console.error(`delete-account: failed to clear ${bucket}/${folderId}`, err)
  }
}

/**
 * Permanently deletes the caller's account: every shop they own (products,
 * categories, orders, pages, delivery zones, subscriptions/payments — all
 * via FK cascade from shops), their uploaded images, and the auth account
 * itself. Irreversible; the confirmation UX lives in AccountSection.
 *
 * Deletes products before their shop rather than relying on deleteUser()'s
 * cascade to reach them: products.category_id -> categories is ON DELETE
 * RESTRICT (CategoriesPage relies on this — a merchant can't delete a
 * category that still has products). If the shop's cascade happened to
 * process categories before products, that RESTRICT would abort the whole
 * deletion. Deleting products first removes the ordering hazard entirely.
 */
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

    const { data: shops, error: shopsError } = await admin.from('shops').select('id').eq('owner_id', userId)
    if (shopsError) throw shopsError

    for (const shop of shops ?? []) {
      const { data: products } = await admin.from('products').select('id').eq('shop_id', shop.id)
      const { data: categories } = await admin.from('categories').select('id').eq('shop_id', shop.id)

      for (const product of products ?? []) {
        await clearBucketFolder(admin, 'product-images', product.id)
      }
      for (const category of categories ?? []) {
        await clearBucketFolder(admin, 'category-images', category.id)
      }
      await clearBucketFolder(admin, 'shop-assets', shop.id)

      const { error: deleteProductsError } = await admin.from('products').delete().eq('shop_id', shop.id)
      if (deleteProductsError) throw deleteProductsError

      const { error: deleteShopError } = await admin.from('shops').delete().eq('id', shop.id)
      if (deleteShopError) throw deleteShopError
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
    if (deleteUserError) throw deleteUserError

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
        plan: plan.key,
        amount: plan.priceXof,
        currency: 'XOF',
        client_reference: `manual_${shopId}_${Date.now()}`,
        status: 'pending',
      })
      if (insertError) throw insertError
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
