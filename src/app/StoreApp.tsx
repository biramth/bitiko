import { lazy } from 'react'
import { Route, Routes, useSearchParams } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { DraftPreviewProvider } from '@/features/store-builder/useEmbeddedPreview'
import { StoreLayout } from '@/layouts/StoreLayout'
import { ShopNotFoundPage } from '@/pages/store/ShopNotFoundPage'
import { StoreShell } from '@/components/ui/StoreShell'
import { StoreNotFoundPage } from '@/pages/store/StoreNotFoundPage'

// Each storefront page is its own chunk (StoreLayout already wraps <Outlet/> in
// a Suspense boundary), so the home page doesn't ship the checkout funnel.
const HomePage = lazy(() => import('@/pages/store/HomePage').then((m) => ({ default: m.HomePage })))
const CatalogPage = lazy(() => import('@/pages/store/CatalogPage').then((m) => ({ default: m.CatalogPage })))
const ServicesPage = lazy(() => import('@/pages/store/ServicesPage').then((m) => ({ default: m.ServicesPage })))
const BookingPage = lazy(() => import('@/pages/store/BookingPage').then((m) => ({ default: m.BookingPage })))
const ProductPage = lazy(() => import('@/pages/store/ProductPage').then((m) => ({ default: m.ProductPage })))
const CartPage = lazy(() => import('@/pages/store/CartPage').then((m) => ({ default: m.CartPage })))
const CheckoutPage = lazy(() => import('@/pages/store/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const OrderConfirmationPage = lazy(() => import('@/pages/store/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage })))
const StorePageView = lazy(() => import('@/pages/store/StorePageView').then((m) => ({ default: m.StorePageView })))
const AccountPage = lazy(() => import('@/pages/store/AccountPage').then((m) => ({ default: m.AccountPage })))

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
          <Route path="prestations" element={<ServicesPage />} />
          <Route path="reserver" element={<BookingPage />} />
          <Route path="produits/:slug" element={<ProductPage />} />
          <Route path="panier" element={<CartPage />} />
          <Route path="commande" element={<CheckoutPage />} />
          <Route path="commande/confirmation/:id" element={<OrderConfirmationPage />} />
          <Route path="pages/:slug" element={<StorePageView />} />
          <Route path="compte" element={<AccountPage />} />
          <Route path="*" element={<StoreNotFoundPage />} />
        </Route>
      </Routes>
    </DraftPreviewProvider>
  )
}