import { useTenant } from '@/features/tenant/TenantContext'
import { AppointmentsRenderer } from '@/features/store-builder/sections/AppointmentsSection'
import { useStorefrontCapabilities } from '@/features/store-builder/useStorefrontCapabilities'
import { ServicesRenderer } from '@/features/store-builder/sections/ServicesSection'
import { useEffectiveTemplateConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { usePageSeo } from '@/hooks/usePageSeo'
import type { AppointmentsSectionConfig, ServicesSectionConfig } from '@/types/builder'

const FULL_CATALOG_CONFIG: ServicesSectionConfig = {
  heading: 'Nos prestations',
  sort: 'manual',
  limit: 48,
  enableFilters: true,
}

const BOOKING_CONFIG: AppointmentsSectionConfig = {
  heading: 'Réserver un créneau',
  showTeam: true,
  defaultDuration: 30,
}

/** Page publique `/prestations` : toutes les prestations avec recherche,
 *  catégories, tri et pagination — la cible des liens « Tout voir » et du
 *  lien catalogue des métiers 100 % service. */
export function ServicesPage() {
  const { shop } = useTenant()
  const { themeConfig } = useEffectiveTemplateConfig(shop, 'catalogue')
  const capabilities = useStorefrontCapabilities(shop)
  usePageSeo({
    title: shop ? `Prestations — ${shop.name}` : 'Prestations',
    description: shop ? `Découvrez toutes les prestations de ${shop.name}${shop.description ? ` — ${shop.description}` : ''}.` : undefined,
    image: shop?.banner_url ?? shop?.logo_url,
    siteName: shop?.name,
  })

  if (!shop) return null
  return (
    <>
      <ServicesRenderer shop={shop} config={FULL_CATALOG_CONFIG} themeConfig={themeConfig} />
      {capabilities?.has('HAS_APPOINTMENTS') && (
        <AppointmentsRenderer shop={shop} config={BOOKING_CONFIG} themeConfig={themeConfig} />
      )}
    </>
  )
}
