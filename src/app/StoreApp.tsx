import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { StoreRoutes } from '@/routes/StoreRoutes'
import { ShopNotFoundPage } from '@/pages/store/ShopNotFoundPage'
import { Spinner } from '@/components/ui/Spinner'

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
      <StoreRoutes />
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
