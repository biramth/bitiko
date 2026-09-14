import { Routes, Route } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { storeRoutes } from '@/routes/StoreRoutes'
import { ShopNotFoundPage } from '@/pages/store/ShopNotFoundPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { Spinner } from '@/components/ui/Spinner'

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
      {storeRoutes}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
