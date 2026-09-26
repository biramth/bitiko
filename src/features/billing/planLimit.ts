/** Message lisible pour une erreur `plan_limit_exceeded` levée par un trigger
 *  de plafond (services, équipiers…). `null` si l'erreur est d'un autre type. */
export function planLimitMessage(error: unknown): string | null {
  const message =
    typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : ''
  if (!message.includes('plan_limit_exceeded')) return null
  const detail = message.split('plan_limit_exceeded:')[1]?.trim()
  return `${detail ? `${detail.charAt(0).toUpperCase()}${detail.slice(1)}. ` : 'Limite du plan atteinte. '}Passez à un plan supérieur pour en ajouter.`
}
