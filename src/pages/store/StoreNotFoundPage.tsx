import { Link } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { useEffectiveTemplateConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { SectionList } from '@/features/store-builder/SectionList'
import { usePageSeo } from '@/hooks/usePageSeo'

/** The storefront's own 404 — editable like any other system template
 *  (Réglages → Personnaliser → Page 404), rendered inside `StoreLayout` so a
 *  mistyped URL still shows the shop's header/footer instead of a bare page. */
export function StoreNotFoundPage() {
  const { shop } = useTenant()
  const { bodySections, themeConfig, isDraftPreview } = useEffectiveTemplateConfig(shop, 'not_found')
  usePageSeo({
    title: shop ? `Page introuvable — ${shop.name}` : 'Page introuvable',
    noindex: true,
    siteName: shop?.name,
  })

  if (!shop) return null

  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window

  return (
    <div className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 text-center">
      <SectionList sections={bodySections} shop={shop} themeConfig={themeConfig} isEmbeddedPreview={isEmbeddedPreview} />
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-[var(--shop-text)] underline underline-offset-2">
        Retour à l'accueil
      </Link>
    </div>
  )
}
