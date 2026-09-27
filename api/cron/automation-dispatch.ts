import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { isCronAuthorized } from '../_lib/cronAuth.js'
import { dispatchEvents } from '../_lib/automationDispatch.js'
import { runOnboardingNudges } from '../_lib/onboardingNudge.js'
import { runScheduledCampaigns } from '../_lib/campaignSend.js'

export { matchRules, renderTemplate } from '../_lib/automationDispatch.js'

/**
 * Filet de sécurité quotidien du moteur d'automatisation (toutes boutiques) :
 * CRON_SECRET obligatoire. Le déclenchement immédiat, après une commande ou une
 * réservation, passe par api/onboarding.ts?action=automation-kick ; la logique
 * commune vit dans api/_lib/automationDispatch.ts.
 *
 * Passe aussi la relance des comptes sans boutique (api/_lib/onboardingNudge.ts) : Vercel Hobby
 * limite à 2 crons, donc ce passage quotidien sert aux deux tâches. Un échec de la relance ne
 * fait pas échouer le moteur d'automatisation.
 *
 * Envoie enfin les campagnes programmées dont la date est passée
 * (api/_lib/campaignSend.ts) : même moteur que l'envoi immédiat, sans
 * double-envoi ; un échec repasse la campagne en brouillon pour reprise
 * manuelle au lieu de réessayer en boucle chaque matin.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req.headers.authorization)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const admin = getSupabaseAdmin()
    const result = await dispatchEvents(admin)

    let onboardingNudges: unknown
    try {
      const rootDomain = process.env.VITE_ROOT_DOMAIN
      onboardingNudges = await runOnboardingNudges(admin, {
        origin: rootDomain ? `https://${rootDomain}` : 'https://bitiko.shop',
      })
    } catch (nudgeErr) {
      console.error('onboarding-nudges failed', nudgeErr)
      onboardingNudges = { error: nudgeErr instanceof Error ? nudgeErr.message : 'Erreur inconnue.' }
    }

    let scheduledCampaigns: unknown
    try {
      const rootDomain = process.env.VITE_ROOT_DOMAIN
      scheduledCampaigns = await runScheduledCampaigns(admin, rootDomain ? `https://${rootDomain}` : 'https://bitiko.shop')
    } catch (campaignErr) {
      console.error('scheduled-campaigns failed', campaignErr)
      scheduledCampaigns = { error: campaignErr instanceof Error ? campaignErr.message : 'Erreur inconnue.' }
    }

    res.status(200).json({ ...result, onboardingNudges, scheduledCampaigns })
  } catch (err) {
    console.error('automation-dispatch failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
