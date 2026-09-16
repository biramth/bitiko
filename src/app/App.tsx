import { useTenant } from '@/features/tenant/TenantContext'
import { ScrollToTop } from '@/components/ScrollToTop'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { PlatformRoutes } from '@/routes/PlatformRoutes'
import { StoreApp } from './StoreApp'

export function App() {
  const { tenant } = useTenant()
  return (
    <>
      <ScrollToTop />
      <GoogleAnalytics />
      {tenant.type === 'platform' ? <PlatformRoutes /> : <StoreApp />}
    </>
  )
}
