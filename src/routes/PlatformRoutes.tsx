import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { AdminRoutes } from './AdminRoutes'

const LandingPage = lazy(() =>
  import('@/pages/marketing/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const SignupPage = lazy(() =>
  import('@/pages/auth/SignupPage').then((m) => ({ default: m.SignupPage })),
)
const AuthCallbackPage = lazy(() =>
  import('@/pages/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

const standalone = (page: React.ReactNode) => (
  <Suspense fallback={<Spinner />}>{page}</Suspense>
)

export function PlatformRoutes() {
  return (
    <Routes>
      <Route index element={standalone(<LandingPage />)} />
      <Route path="inscription" element={standalone(<SignupPage />)} />
      <Route path="auth/callback" element={standalone(<AuthCallbackPage />)} />
      <AdminRoutes />
      <Route path="*" element={standalone(<NotFoundPage />)} />
    </Routes>
  )
}