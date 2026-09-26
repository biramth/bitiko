import { useQuery } from '@tanstack/react-query'
import { DEFAULT_BOOKING_SETTINGS, getBookingSettings } from '@/services/bookingSettings.service'
import { localDateIso } from '@/utils/format'

export const bookingInputClass =
  'w-full border border-[var(--shop-text)]/20 bg-transparent px-3 py-2 text-sm text-[var(--shop-text)] placeholder:text-[var(--shop-text)]/40 focus:border-[var(--shop-text)] focus:outline-none'

export const bookingLabelClass = 'mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)]/60'

/** Horaires publics de la boutique (défauts serveur si rien n'est configuré). */
export function useShopBookingSettings(shopId: string) {
  return useQuery({
    queryKey: ['booking-settings', shopId],
    queryFn: async () => (await getBookingSettings(shopId)) ?? { shop_id: shopId, updated_at: '', ...DEFAULT_BOOKING_SETTINGS },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}

/** Heure d'un créneau affichée dans le fuseau de la boutique. */
export function formatSlotTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone })
}

/** Bornes du sélecteur de date : aujourd'hui → horizon de réservation. */
export function bookingDateBounds(maxDaysAhead: number): { min: string; max: string } {
  const max = new Date()
  max.setDate(max.getDate() + maxDaysAhead)
  return { min: localDateIso(), max: localDateIso(max) }
}
