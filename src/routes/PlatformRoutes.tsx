import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RequireShop } from './RequireShop'

const LandingPage = lazy(() =>
  import('@/pages/marketing/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const SignupPage = lazy(() =>
  import('@/pages/auth/SignupPage').then((m) => ({ default: m.SignupPage })),
)
const AuthCallbackPage = lazy(() =>
  import('@/pages/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const TermsPage = lazy(() => import('@/pages/legal/TermsPage').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() =>
  import('@/pages/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
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
const StoreBuilderPage = lazy(() =>
  import('@/pages/admin/StoreBuilderPage').then((m) => ({ default: m.StoreBuilderPage })),
)
const BillingPage = lazy(() =>
  import('@/pages/admin/BillingPage').then((m) => ({ default: m.BillingPage })),
)
const SuperAdminPage = lazy(() =>
  import('@/pages/admin/SuperAdminPage').then((m) => ({ default: m.SuperAdminPage })),
)

const standalone = (page: React.ReactNode) => (
  <Suspense fallback={<Spinner />}>{page}</Suspense>
)

export function PlatformRoutes() {
  return (
    <Routes>
      <Route index element={standalone(<LandingPage />)} />
      <Route path="inscription" element={standalone(<SignupPage />)} />
      <Route path="mot-de-passe-oublie" element={standalone(<ForgotPasswordPage />)} />
      <Route path="reinitialiser-mot-de-passe" element={standalone(<ResetPasswordPage />)} />
      <Route path="legal/cgu" element={standalone(<TermsPage />)} />
      <Route path="legal/confidentialite" element={standalone(<PrivacyPage />)} />
      <Route path="auth/callback" element={standalone(<AuthCallbackPage />)} />
      <Route element={<ProtectedRoute />}>
        <Route path="super-admin" element={standalone(<SuperAdminPage />)} />
      </Route>
      <Route path="admin">
        <Route path="login" element={standalone(<LoginPage />)} />
        <Route element={<ProtectedRoute />}>
          <Route path="onboarding" element={standalone(<OnboardingPage />)} />
          <Route element={<RequireShop />}>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="produits" element={standalone(<ProductsPage />)} />
              <Route path="produits/nouveau" element={standalone(<ProductFormPage />)} />
              <Route path="produits/:id" element={standalone(<ProductFormPage />)} />
              <Route path="categories" element={standalone(<CategoriesPage />)} />
              <Route path="commandes" element={standalone(<OrdersPage />)} />
              <Route path="commandes/:id" element={standalone(<OrderDetailPage />)} />
              <Route path="personnaliser" element={standalone(<StoreBuilderPage />)} />
              <Route path="facturation" element={standalone(<BillingPage />)} />
              <Route path="parametres">
                <Route index element={<Navigate to="general" replace />} />
                <Route path=":section" element={standalone(<SettingsPage />)} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={standalone(<NotFoundPage />)} />
    </Routes>
  )
}