import { Route } from 'react-router-dom'
import { StoreLayout } from '@/layouts/StoreLayout'
import { HomePage } from '@/pages/store/HomePage'
import { CatalogPage } from '@/pages/store/CatalogPage'
import { ProductPage } from '@/pages/store/ProductPage'
import { CartPage } from '@/pages/store/CartPage'
import { CheckoutPage } from '@/pages/store/CheckoutPage'

export const publicRoutes = (
  <Route element={<StoreLayout />}>
    <Route index element={<HomePage />} />
    <Route path="catalogue" element={<CatalogPage />} />
    <Route path="produits/:slug" element={<ProductPage />} />
    <Route path="panier" element={<CartPage />} />
    <Route path="commande" element={<CheckoutPage />} />
  </Route>
)
