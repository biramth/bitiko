import { useTenant } from '@/features/tenant/TenantContext'
import { TemplateBody } from '@/features/store-builder/TemplateBody'
import { usePageSeo } from '@/hooks/usePageSeo'

export function CartPage() {
  const { shop } = useTenant()
  usePageSeo({ title: shop ? `Panier — ${shop.name}` : 'Panier', noindex: true })

  return <TemplateBody template="cart" />
}