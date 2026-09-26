import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { isCronAuthorized } from '../_lib/cronAuth.js'
import { dispatchEvents } from '../_lib/automationDispatch.js'

export { matchRules, renderTemplate } from '../_lib/automationDispatch.js'

/**
 * Filet de sécurité quotidien du moteur d'automatisation (toutes boutiques) :
 * CRON_SECRET obligatoire. Le déclenchement immédiat, après une commande ou une
 * réservation, passe par api/onboarding.ts?action=automation-kick ; la logique
 * commune vit dans api/_lib/automationDispatch.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req.headers.authorization)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const result = await dispatchEvents(getSupabaseAdmin())
    res.status(200).json(result)
  } catch (err) {
    console.error('automation-dispatch failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
