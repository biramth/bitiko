import { useTenant } from '@/features/tenant/TenantContext'
import { useEffectiveShopConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { SectionList } from '@/features/store-builder/SectionList'
import { usePageSeo } from '@/hooks/usePageSeo'

export function HomePage() {
  const { shop } = useTenant()
  usePageSeo({
    title: shop ? `${shop.name} — Boutique en ligne` : 'Boutique en ligne',
    description: shop?.description ?? undefined,
    image: shop?.banner_url ?? shop?.logo_url,
  })
  const { bodySections, themeConfig, isDraftPreview } = useEffectiveShopConfig(shop)

  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window

  if (!shop) return null

  return (
    <div>
      <SectionList sections={bodySections} shop={shop} themeConfig={themeConfig} isEmbeddedPreview={isEmbeddedPreview} />
    </div>
  )
}
