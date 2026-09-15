import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPlatformAdminFromAuthHeader, getSupabaseAdmin } from '../_lib/supabaseAdmin.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    console.error('pending-payments failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
