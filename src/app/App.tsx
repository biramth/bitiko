import { lazy, Suspense } from 'react'
import { useTenant } from '@/features/tenant/TenantContext'
import { ScrollToTop } from '@/components/ScrollToTop'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { SelfAnalytics } from '@/components/SelfAnalytics'
import { PageLoader } from '@/components/ui/PageLoader'

// Only one of the two apps is ever rendered for a given visitor, so each is its
// own chunk — a shop visitor never downloads the admin code, and vice versa.
const PlatformRoutes = lazy(() =>
  import('@/routes/PlatformRoutes').then((m) => ({ default: m.PlatformRoutes })),
)
const StoreApp = lazy(() => import('./StoreApp').then((m) => ({ default: m.StoreApp })))

export function App() {
  const { tenant } = useTenant()
  return (
    <>
      <ScrollToTop />
      <GoogleAnalytics />
      <SelfAnalytics />
      <Suspense fallback={<PageLoader />}>
        {tenant.type === 'platform' ? <PlatformRoutes /> : <StoreApp />}
      </Suspense>
    </>
  )
}
