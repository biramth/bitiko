import { useTenant } from '@/features/tenant/TenantContext'
import { useEffectiveShopConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { SectionList } from '@/features/store-builder/SectionList'
import { useStorefrontCapabilities } from '@/features/store-builder/useStorefrontCapabilities'
import { usePageSeo } from '@/hooks/usePageSeo'

export function HomePage() {
  const { shop } = useTenant()
  usePageSeo({
    title: shop ? `${shop.name} — Boutique en ligne` : 'Boutique en ligne',
    description: shop?.description ?? undefined,
    image: shop?.banner_url ?? shop?.logo_url,
    siteName: shop?.name,
  })
  const { bodySections, themeConfig, isDraftPreview, inlineEditable } = useEffectiveShopConfig(shop)
  const capabilities = useStorefrontCapabilities(shop)

  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window

  if (!shop) return null

  return (
    <div>
      <SectionList
        sections={bodySections}
        shop={shop}
        themeConfig={themeConfig}
        isEmbeddedPreview={isEmbeddedPreview}
        inlineEditable={inlineEditable}
        capabilities={capabilities}
      />
    </div>
  )
}
