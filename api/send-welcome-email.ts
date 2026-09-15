import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendEmail } from './_lib/resendEmail.js'
import { welcomeEmailHtml } from './_lib/emailTemplates.js'

/**
 * Fired once, right after onboarding creates a shop. The recipient email
 * comes from the authenticated user's own account (never from the request
 * body) so this can't be used to spam an arbitrary address, and a failure
 * here is logged but never surfaced as an onboarding error — the shop
 * already exists either way.
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
  } catch (err) {
    console.error('send-welcome-email failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
