/** Déclenche tout de suite les automatisations activées de la boutique
 *  (best-effort : le cron quotidien reste le filet de sécurité). */
export async function kickAutomations(shopId: string): Promise<void> {
  try {
    await fetch('/api/automation-kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId }),
    })
  } catch {
    // Silencieux : les événements restent en base et seront traités par le cron.
  }
}
