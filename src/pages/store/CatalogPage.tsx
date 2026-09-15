import { useTenant } from '@/features/tenant/TenantContext'
import { TemplateBody } from '@/features/store-builder/TemplateBody'
import { usePageSeo } from '@/hooks/usePageSeo'

export function CatalogPage() {
  const { shop } = useTenant()
  usePageSeo({ title: shop ? `Catalogue — ${shop.name}` : 'Catalogue' })

  return <TemplateBody template="catalogue" />
}