import { useTenant } from '@/features/tenant/TenantContext'
import { ScrollToTop } from '@/components/ScrollToTop'
import { PlatformRoutes } from '@/routes/PlatformRoutes'
import { StoreApp } from './StoreApp'

export function App() {
  const { tenant } = useTenant()
  return (
    <>
      <ScrollToTop />
      {tenant.type === 'platform' ? <PlatformRoutes /> : <StoreApp />}
    </>
  )
}
