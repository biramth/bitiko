import { Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/pages/marketing/LandingPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { adminRoutes } from './AdminRoutes'

export function PlatformRoutes() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="inscription" element={<SignupPage />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />
      {adminRoutes}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
