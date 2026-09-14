import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { StoreLayout } from '@/layouts/StoreLayout'

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

export function StoreRoutes() {
  return (
    <Route element={<StoreLayout />}>
      <Route index element={<HomePage />} />
      <Route path="catalogue" element={<CatalogPage />} />
      <Route path="produits/:slug" element={<ProductPage />} />
      <Route path="panier" element={<CartPage />} />
      <Route path="commande" element={<CheckoutPage />} />
    </Route>
  )
}