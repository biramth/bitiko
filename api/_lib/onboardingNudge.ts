import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from './resendEmail.js'
import { onboardingNudgeEmailHtml } from './emailTemplates.js'

export interface NudgeCandidate {
  user_id: string
  email: string
  full_name: string | null
}

export interface NudgeResult {
  candidates: number
  sent: number
  failed: number
}

/** Prénom pour l'accroche de l'email : premier mot du nom, sinon rien. */
export function firstNameOf(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0]
  return first || null
}

/**
 * Relance unique des comptes sans boutique (voir la migration 0137). La ligne `onboarding_nudges`
 * est écrite AVANT l'envoi : deux exécutions simultanées ne relancent jamais deux fois. Si l'envoi
 * échoue, la ligne est retirée et le compte sera retenté au prochain passage (tant qu'il reste dans
 * la fenêtre de la fonction SQL).
 */
export async function runOnboardingNudges(
  admin: SupabaseClient,
  options: { origin: string; send?: typeof sendEmail; limit?: number } = { origin: 'https://bitiko.shop' },
): Promise<NudgeResult> {
  const send = options.send ?? sendEmail
  const { data, error } = await admin.rpc('get_onboarding_nudge_candidates', { p_limit: options.limit ?? 50 })
  if (error) throw error
  const candidates = (data ?? []) as NudgeCandidate[]

  let sent = 0
  let failed = 0
  for (const candidate of candidates) {
    const { error: claimError } = await admin.from('onboarding_nudges').insert({ user_id: candidate.user_id })
    if (claimError) {
      // Déjà réclamé par une autre exécution (ou erreur ponctuelle) : on passe.
      failed++
      continue
    }
    try {
      await send({
        to: candidate.email,
        subject: 'Ta boutique Bitiko est à une minute',
        html: onboardingNudgeEmailHtml({ origin: options.origin, firstName: firstNameOf(candidate.full_name) }),
      })
      sent++
    } catch (err) {
      failed++
      console.error('onboarding-nudge: send failed for user', candidate.user_id, err)
      await admin.from('onboarding_nudges').delete().eq('user_id', candidate.user_id)
    }
  }
  return { candidates: candidates.length, sent, failed }
}
