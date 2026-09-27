import type { SupabaseClient } from '@supabase/supabase-js'
import type { AutomatedEmailKey, AutomatedEmailOverride } from './emailTemplates.js'

export const AUTOMATED_EMAIL_KEYS: AutomatedEmailKey[] = ['welcome', 'plan-activated', 'renewal-reminder']

export interface AutomatedEmailRow extends AutomatedEmailOverride {
  key: AutomatedEmailKey
  is_enabled: boolean
}

/**
 * Charge la surcharge éditée par l'équipe pour un email automatique, ou null
 * quand la ligne est absente (migration pas encore appliquée, ou clé
 * inconnue) — l'appelant utilise alors le contenu historique et envoie
 * normalement. Un email explicitement désactivé (`is_enabled: false`)
 * demande à l'appelant de ne pas envoyer du tout.
 */
export async function getAutomatedEmail(
  admin: SupabaseClient,
  key: AutomatedEmailKey,
): Promise<AutomatedEmailRow | null> {
  try {
    const { data, error } = await admin
      .from('automated_emails')
      .select('key, subject, body, button_label, button_url, is_enabled')
      .eq('key', key)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      key: data.key as AutomatedEmailKey,
      subject: data.subject as string,
      body: data.body as string,
      buttonLabel: (data.button_label as string | null) ?? null,
      buttonUrl: (data.button_url as string | null) ?? null,
      is_enabled: (data.is_enabled as boolean) ?? true,
    }
  } catch (err) {
    console.error(`automated-emails: lecture impossible (${key}), contenu par défaut.`, err)
    return null
  }
}
