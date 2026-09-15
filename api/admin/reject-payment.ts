import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPlatformAdminFromAuthHeader, getSupabaseAdmin } from '../_lib/supabaseAdmin.js'

/** For a claimed payment that never actually shows up in Wave's transaction list. */
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
    const { error } = await supabase.from('wave_payments').update({ status: 'failed' }).eq('id', paymentId)
    if (error) throw error

    res.status(200).json({ status: 'failed' })
  } catch (err) {
    console.error('reject-payment failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
