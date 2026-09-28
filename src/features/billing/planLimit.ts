/** Vrai pour une erreur `plan_limit_exceeded` levée par un trigger de plafond
 *  (services, équipiers, saisies…) : l'écran ouvre alors le panneau
 *  d'activation contextuel plutôt que d'afficher une erreur brute. */
export function isPlanLimitError(error: unknown): boolean {
  const message =
    typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : ''
  return message.includes('plan_limit_exceeded')
}
