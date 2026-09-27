/** Erreur dont le message est déjà rédigé pour le marchand (session expirée, numéro invalide…). */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

export interface OnboardingErrorInfo {
  message: string
  /** L'adresse choisie vient d'être prise par quelqu'un d'autre : à corriger, pas à réessayer. */
  slugTaken: boolean
}

const asText = (value: unknown) => (typeof value === 'string' ? value : '')

/**
 * Message affichable pour une création de boutique qui échoue : réseau coupé, adresse prise entre
 * la vérification et l'envoi, droits, ou message déjà rédigé par notre code. Jamais de texte
 * technique brut pour le marchand.
 */
export function describeOnboardingError(err: unknown): OnboardingErrorInfo {
  if (err instanceof UserFacingError) return { message: err.message, slugTaken: false }

  const record = (err && typeof err === 'object' ? err : {}) as Record<string, unknown>
  const code = asText(record.code)
  const lower = (err instanceof Error ? err.message : asText(record.message)).toLowerCase()

  if (code === '23505' || lower.includes('duplicate key') || lower.includes('shops_slug')) {
    return { message: 'Cette adresse vient d’être prise par quelqu’un d’autre. Choisis-en une autre, puis réessaie.', slugTaken: true }
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed') || lower.includes('load failed')) {
    return { message: 'Connexion perdue. Vérifie ton réseau puis appuie sur « Réessayer » : rien n’est perdu.', slugTaken: false }
  }
  if (lower.includes('plan_limit')) {
    return { message: 'Ta formule ne permet pas de créer une boutique de plus pour le moment.', slugTaken: false }
  }
  if (code === '42501' || lower.includes('permission denied') || lower.includes('row-level security')) {
    return {
      message: 'Ton compte n’a pas pu créer la boutique. Recharge la page, reconnecte-toi puis réessaie ; si ça persiste, écris-nous depuis le bouton d’aide.',
      slugTaken: false,
    }
  }
  return {
    message: 'Impossible de créer ton espace pour le moment. Appuie sur « Réessayer » ; si ça persiste, écris-nous depuis le bouton d’aide.',
    slugTaken: false,
  }
}
