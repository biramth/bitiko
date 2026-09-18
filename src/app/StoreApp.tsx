import { Route, Routes, useSearchParams } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { DraftPreviewProvider } from '@/features/store-builder/useEmbeddedPreview'
import { StoreLayout } from '@/layouts/StoreLayout'
import { ShopNotFoundPage } from '@/pages/store/ShopNotFoundPage'
import { StoreShell } from '@/components/ui/StoreShell'
import { HomePage } from '@/pages/store/HomePage'
import { CatalogPage } from '@/pages/store/CatalogPage'
import { ProductPage } from '@/pages/store/ProductPage'
import { CartPage } from '@/pages/store/CartPage'
import { CheckoutPage } from '@/pages/store/CheckoutPage'
import { OrderConfirmationPage } from '@/pages/store/OrderConfirmationPage'
import { StorePageView } from '@/pages/store/StorePageView'
import { StoreNotFoundPage } from '@/pages/store/StoreNotFoundPage'

/** Root storefront route. On subdomains a custom page has a real path
 * (/pages/:slug); in the query-param preview fallback the page comes via
 * `?page=pages/<slug>`, so we branch here. */
function StoreIndexRoute() {
  const [searchParams] = useSearchParams()
  const pagePath = searchParams.get('page')
  return pagePath ? <StorePageView pageSlug={pagePath} /> : <HomePage />
}

export function StoreApp() {
  const { isLoading, notFound } = useTenant()

  if (isLoading) {
    return <StoreShell />
  }

  if (notFound) return <ShopNotFoundPage />

  return (
    <DraftPreviewProvider>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<StoreIndexRoute />} />
          <Route path="catalogue" element={<CatalogPage />} />
          <Route path="produits/:slug" element={<ProductPage />} />
          <Route path="panier" element={<CartPage />} />
          <Route path="commande" element={<CheckoutPage />} />
          <Route path="commande/confirmation/:id" element={<OrderConfirmationPage />} />
          <Route path="pages/:slug" element={<StorePageView />} />
          <Route path="*" element={<StoreNotFoundPage />} />
        </Route>
      </Routes>
    </DraftPreviewProvider>
  )
}