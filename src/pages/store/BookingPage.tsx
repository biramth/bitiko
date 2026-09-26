import { Navigate } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { AppointmentsRenderer } from '@/features/store-builder/sections/AppointmentsSection'
import { ReservationsRenderer } from '@/features/store-builder/sections/ReservationsSection'
import { useStorefrontCapabilitiesState } from '@/features/store-builder/useStorefrontCapabilities'
import { useEffectiveTemplateConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { getStorefrontVocabulary } from '@/config/storefrontVocabulary'
import { usePageSeo } from '@/hooks/usePageSeo'
import { Spinner } from '@/components/ui/Spinner'
import type { AppointmentsSectionConfig, ReservationsSectionConfig } from '@/types/builder'

const APPOINTMENTS_CONFIG: AppointmentsSectionConfig = {
  heading: 'Prendre rendez-vous',
  showTeam: true,
  defaultDuration: 30,
}

const RESERVATIONS_CONFIG: ReservationsSectionConfig = {
  heading: 'Réserver une table',
  showAvailability: true,
}

/** Page publique `/reserver` : le formulaire de réservation du métier (rendez-vous
 *  ou table) sur une page dédiée — la cible des boutons « Réserver » du header, du
 *  hero et de la barre mobile. Un commerce sans réservation retombe sur l'accueil. */
export function BookingPage() {
  const { shop } = useTenant()
  const { themeConfig } = useEffectiveTemplateConfig(shop, 'catalogue')
  const { capabilities, isLoading } = useStorefrontCapabilitiesState(shop)
  const booking = getStorefrontVocabulary(capabilities).booking
  usePageSeo({
    title: shop ? `${booking?.label ?? 'Réserver'} — ${shop.name}` : 'Réserver',
    description: shop ? `${booking?.label ?? 'Réserver'} chez ${shop.name}.` : undefined,
    image: shop?.banner_url ?? shop?.logo_url,
    siteName: shop?.name,
  })

  if (!shop) return null
  if (isLoading) return <Spinner />
  if (!booking) return <Navigate to="/" replace />

  return capabilities?.has('HAS_APPOINTMENTS') ? (
    <AppointmentsRenderer shop={shop} config={APPOINTMENTS_CONFIG} themeConfig={themeConfig} />
  ) : (
    <ReservationsRenderer shop={shop} config={RESERVATIONS_CONFIG} themeConfig={themeConfig} />
  )
}
