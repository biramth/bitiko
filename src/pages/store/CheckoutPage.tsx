import { useTenant } from '@/features/tenant/TenantContext'
import { TemplateBody } from '@/features/store-builder/TemplateBody'
import { usePageSeo } from '@/hooks/usePageSeo'

export function CheckoutPage() {
  const { shop } = useTenant()
  usePageSeo({ title: shop ? `Commande — ${shop.name}` : 'Commande', noindex: true })

  return <TemplateBody template="checkout" />
}