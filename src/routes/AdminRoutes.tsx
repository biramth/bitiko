import { lazy, Suspense } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RequireShop } from './RequireShop'
import { Spinner } from '@/components/ui/Spinner'

const LoginPage = lazy(() => import('@/pages/admin/LoginPage').then((m) => ({ default: m.LoginPage })))
const OnboardingPage = lazy(() =>
  import('@/pages/admin/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const ProductsPage = lazy(() =>
  import('@/pages/admin/ProductsPage').then((m) => ({ default: m.ProductsPage })),
)
const ProductFormPage = lazy(() =>
  import('@/pages/admin/ProductFormPage').then((m) => ({ default: m.ProductFormPage })),
)
const CategoriesPage = lazy(() =>
  import('@/pages/admin/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
)
const OrdersPage = lazy(() => import('@/pages/admin/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const OrderDetailPage = lazy(() =>
  import('@/pages/admin/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

const standalone = (page: React.ReactNode) => (
  <Suspense fallback={<Spinner />}>{page}</Suspense>
)

export function AdminRoutes() {
  return (
    <Route path="admin">
      <Route path="login" element={standalone(<LoginPage />)} />
      <Route element={<ProtectedRoute />}>
        <Route path="onboarding" element={standalone(<OnboardingPage />)} />
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
}