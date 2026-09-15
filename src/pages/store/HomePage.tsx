import { useTenant } from '@/features/tenant/TenantContext'
import { useEffectiveShopConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { SECTION_REGISTRY } from '@/features/store-builder/sectionRegistry'
import { usePageSeo } from '@/hooks/usePageSeo'

export function HomePage() {
  const { shop } = useTenant()
  usePageSeo({
    title: shop ? `${shop.name} — Boutique en ligne` : 'Boutique en ligne',
    description: shop?.description ?? undefined,
    image: shop?.banner_url ?? shop?.logo_url,
  })
  const { bodySections, themeConfig } = useEffectiveShopConfig(shop)

  if (!shop) return null

  return (
    <div>
      {bodySections.map((section) => {
        const Renderer = SECTION_REGISTRY[section.type].Renderer
        if (!Renderer) return null
        return <Renderer key={section.id} shop={shop} config={section.config} themeConfig={themeConfig} />
      })}
    </div>
  )
}
