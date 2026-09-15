import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { StoreLayout } from '@/layouts/StoreLayout'
import { ShopNotFoundPage } from '@/pages/store/ShopNotFoundPage'
import { Spinner } from '@/components/ui/Spinner'

const HomePage = lazy(() => import('@/pages/store/HomePage').then((m) => ({ default: m.HomePage })))
const CatalogPage = lazy(() =>
  import('@/pages/store/CatalogPage').then((m) => ({ default: m.CatalogPage })),
)
const ProductPage = lazy(() =>
  import('@/pages/store/ProductPage').then((m) => ({ default: m.ProductPage })),
)
const CartPage = lazy(() => import('@/pages/store/CartPage').then((m) => ({ default: m.CartPage })))
const CheckoutPage = lazy(() =>
  import('@/pages/store/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
)
const StorePageView = lazy(() =>
  import('@/pages/store/StorePageView').then((m) => ({ default: m.StorePageView })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

export function StoreApp() {
  const { isLoading, notFound } = useTenant()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (notFound) return <ShopNotFoundPage />

  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogue" element={<CatalogPage />} />
        <Route path="produits/:slug" element={<ProductPage />} />
        <Route path="panier" element={<CartPage />} />
        <Route path="commande" element={<CheckoutPage />} />
        <Route path="pages/:slug" element={<StorePageView />} />
      </Route>
      <Route
        path="*"
        element={
          <Suspense fallback={<Spinner />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  )
}