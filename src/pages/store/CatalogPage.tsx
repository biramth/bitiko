import { useTenant } from '@/features/tenant/TenantContext'
import { TemplateBody } from '@/features/store-builder/TemplateBody'
import { usePageSeo } from '@/hooks/usePageSeo'

export function CatalogPage() {
  const { shop } = useTenant()
  usePageSeo({
    title: shop ? `Catalogue — ${shop.name}` : 'Catalogue',
    description: shop ? `Découvrez tous les produits de ${shop.name}${shop.description ? ` — ${shop.description}` : ''}.` : undefined,
    image: shop?.banner_url ?? shop?.logo_url,
  })

  return <TemplateBody template="catalogue" />
}