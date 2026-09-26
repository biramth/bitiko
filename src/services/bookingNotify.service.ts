/** Prévient le commerçant par email d'une nouvelle demande (rendez-vous ou
 *  réservation). Best-effort : la réservation est déjà enregistrée en base,
 *  un échec d'envoi ne doit jamais la remettre en cause côté visiteur. */
export async function notifyBooking(kind: 'appointment' | 'reservation', id: string): Promise<void> {
  try {
    await fetch('/api/booking-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id }),
    })
  } catch {
    // Silencieux : voir ci-dessus.
  }
}
