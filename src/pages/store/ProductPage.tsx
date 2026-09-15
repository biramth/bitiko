import { useParams } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { useProduct } from '@/features/products/useProducts'
import { TemplateBody } from '@/features/store-builder/TemplateBody'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useProductStructuredData } from '@/hooks/useProductStructuredData'

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { shop } = useTenant()
  // Fetched here only for SEO metadata; the "Fiche produit" block fetches the
  // same query keyed data via TanStack, so this is cached, not a second call.
  const { data: product } = useProduct(shop?.id, slug)
  const currency = shop?.currency ?? 'XOF'

  usePageSeo({
    title: product ? (shop ? `${product.name} — ${shop.name}` : product.name) : 'Produit',
    description: product?.description ?? undefined,
    image: product?.images[0]?.public_url,
  })
  useProductStructuredData(product ?? null, currency)

  return <TemplateBody template="product" />
}