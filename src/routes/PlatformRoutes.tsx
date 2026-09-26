import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PageLoader } from '@/components/ui/PageLoader'
import { CapabilityGate, RequirePlatformMember } from '@/features/platform/RequirePlatformMember'
import { ProtectedRoute } from './ProtectedRoute'
import { RequireShop } from './RequireShop'

// The landing page and both shells are lazy like every other page: a landing
// visitor must not download the admin layout (and vice versa). Unwrapped lazy
// elements fall back to App's top-level <Suspense> (PageLoader).
const LandingPage = lazy(() =>
  import('@/pages/marketing/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
const AdminLayout = lazy(() =>
  import('@/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const PlatformLayout = lazy(() =>
  import('@/features/platform/PlatformLayout').then((m) => ({ default: m.PlatformLayout })),
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
const CategoryFormPage = lazy(() =>
  import('@/pages/admin/CategoryFormPage').then((m) => ({ default: m.CategoryFormPage })),
)
const OrdersPage = lazy(() => import('@/pages/admin/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const OrderDetailPage = lazy(() =>
  import('@/pages/admin/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
)
const NewOrderPage = lazy(() =>
  import('@/pages/admin/NewOrderPage').then((m) => ({ default: m.NewOrderPage })),
)
const CustomersPage = lazy(() =>
  import('@/pages/admin/CustomersPage').then((m) => ({ default: m.CustomersPage })),
)
const ServicesPage = lazy(() =>
  import('@/pages/admin/ServicesPage').then((m) => ({ default: m.ServicesPage })),
)
const AppointmentsPage = lazy(() =>
  import('@/pages/admin/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })),
)
const TeamPage = lazy(() => import('@/pages/admin/TeamPage').then((m) => ({ default: m.TeamPage })))
const ReservationsPage = lazy(() =>
  import('@/pages/admin/ReservationsPage').then((m) => ({ default: m.ReservationsPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const StoreBuilderPage = lazy(() =>
  import('@/pages/admin/StoreBuilderPage').then((m) => ({ default: m.StoreBuilderPage })),
)
const PlatformHomePage = lazy(() =>
  import('@/pages/platform/PlatformHomePage').then((m) => ({ default: m.PlatformHomePage })),
)
const PlatformAnalyticsPage = lazy(() =>
  import('@/pages/platform/PlatformAnalyticsPage').then((m) => ({ default: m.PlatformAnalyticsPage })),
)
const PlatformShopsPage = lazy(() =>
  import('@/pages/platform/PlatformShopsPage').then((m) => ({ default: m.PlatformShopsPage })),
)
const PlatformPaymentsPage = lazy(() =>
  import('@/pages/platform/PlatformPaymentsPage').then((m) => ({ default: m.PlatformPaymentsPage })),
)
const PlatformCampaignsPage = lazy(() =>
  import('@/pages/platform/PlatformCampaignsPage').then((m) => ({ default: m.PlatformCampaignsPage })),
)
const PlatformPromosPage = lazy(() =>
  import('@/pages/platform/PlatformPromosPage').then((m) => ({ default: m.PlatformPromosPage })),
)
const PlatformTeamPage = lazy(() =>
  import('@/pages/platform/PlatformTeamPage').then((m) => ({ default: m.PlatformTeamPage })),
)
const PlatformBusinessTypesPage = lazy(() =>
  import('@/pages/platform/PlatformBusinessTypesPage').then((m) => ({ default: m.PlatformBusinessTypesPage })),
)

const standalone = (page: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{page}</Suspense>
)

export function PlatformRoutes() {
  return (
    <Routes>
      <Route index element={standalone(<LandingPage />)} />
      {/* /inscription is superseded by the unified email-first flow at
          /admin/login (see LoginPage.tsx) — kept as a redirect so any
          bookmarked or already-shared link still lands somewhere useful. */}
      <Route path="inscription" element={<Navigate to="/admin/login" replace />} />
      <Route path="mot-de-passe-oublie" element={standalone(<ForgotPasswordPage />)} />
      <Route path="reinitialiser-mot-de-passe" element={standalone(<ResetPasswordPage />)} />
      <Route path="legal/cgu" element={standalone(<TermsPage />)} />
      <Route path="legal/confidentialite" element={standalone(<PrivacyPage />)} />
      <Route path="auth/callback" element={standalone(<AuthCallbackPage />)} />
      <Route element={<ProtectedRoute />}>
        {/* /super-admin is superseded by the /plateforme workspace (per-tool
            pages, role-gated). Kept as a redirect so old bookmarks still land. */}
        <Route path="super-admin" element={<Navigate to="/plateforme" replace />} />
        <Route element={<RequirePlatformMember />}>
          <Route element={<PlatformLayout />}>
            <Route path="plateforme" element={standalone(<PlatformHomePage />)} />
            <Route path="plateforme/analytiques" element={standalone(<PlatformAnalyticsPage />)} />
            <Route
              path="plateforme/boutiques"
              element={standalone(
                <CapabilityGate capability="view_shops">
                  <PlatformShopsPage />
                </CapabilityGate>,
              )}
            />
            <Route
              path="plateforme/paiements"
              element={standalone(
                <CapabilityGate capability="manage_payments">
                  <PlatformPaymentsPage />
                </CapabilityGate>,
              )}
            />
            <Route
              path="plateforme/campagnes"
              element={standalone(
                <CapabilityGate capability="send_campaigns">
                  <PlatformCampaignsPage />
                </CapabilityGate>,
              )}
            />
            <Route
              path="plateforme/promotions"
              element={standalone(
                <CapabilityGate capability="send_campaigns">
                  <PlatformPromosPage />
                </CapabilityGate>,
              )}
            />
            <Route
              path="plateforme/equipe"
              element={standalone(
                <CapabilityGate capability="manage_team">
                  <PlatformTeamPage />
                </CapabilityGate>,
              )}
            />
            <Route
              path="plateforme/types"
              element={standalone(
                <CapabilityGate capability="manage_business_types">
                  <PlatformBusinessTypesPage />
                </CapabilityGate>,
              )}
            />
          </Route>
        </Route>
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
              {/* Catégories lives as a tab of Produits now (?tab=categories) —
                  the create-category form stays its own page, but the list
                  itself no longer has a standalone route. */}
              <Route path="categories/nouveau" element={standalone(<CategoryFormPage />)} />
              <Route path="categories" element={<Navigate to="/admin/produits?tab=categories" replace />} />
              <Route path="commandes" element={standalone(<OrdersPage />)} />
              <Route path="commandes/nouvelle" element={standalone(<NewOrderPage />)} />
              <Route path="commandes/:id" element={standalone(<OrderDetailPage />)} />
              <Route path="clients" element={standalone(<CustomersPage />)} />
              <Route path="prestations" element={standalone(<ServicesPage />)} />
              <Route path="rendez-vous" element={standalone(<AppointmentsPage />)} />
              <Route path="equipe" element={standalone(<TeamPage />)} />
              <Route path="reservations" element={standalone(<ReservationsPage />)} />
              <Route path="personnaliser" element={standalone(<StoreBuilderPage />)} />
              {/* Facturation moved into Paramètres (one less top-level nav
                  group in production, where it was the only item under
                  "Développer"). Kept as a redirect — Wave's own success/error
                  URLs and every internal link were updated, but this catches
                  anything external (an old bookmark, a cached email). */}
              <Route path="facturation" element={<Navigate to="/admin/parametres/facturation" replace />} />
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