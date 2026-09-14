import { Route } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RequireShop } from './RequireShop'
import { LoginPage } from '@/pages/admin/LoginPage'
import { OnboardingPage } from '@/pages/admin/OnboardingPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { ProductsPage } from '@/pages/admin/ProductsPage'
import { ProductFormPage } from '@/pages/admin/ProductFormPage'
import { CategoriesPage } from '@/pages/admin/CategoriesPage'
import { OrdersPage } from '@/pages/admin/OrdersPage'
import { OrderDetailPage } from '@/pages/admin/OrderDetailPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'

export const adminRoutes = (
  <Route path="admin">
    <Route path="login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="onboarding" element={<OnboardingPage />} />
      <Route element={<RequireShop />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="produits" element={<ProductsPage />} />
          <Route path="produits/nouveau" element={<ProductFormPage />} />
          <Route path="produits/:id" element={<ProductFormPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="commandes" element={<OrdersPage />} />
          <Route path="commandes/:id" element={<OrderDetailPage />} />
          <Route path="parametres" element={<SettingsPage />} />
        </Route>
      </Route>
    </Route>
  </Route>
)
