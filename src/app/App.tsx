import { useTenant } from '@/features/tenant/TenantContext'
import { PlatformRoutes } from '@/routes/PlatformRoutes'
import { StoreApp } from './StoreApp'

export function App() {
  const { tenant } = useTenant()
  return tenant.type === 'platform' ? <PlatformRoutes /> : <StoreApp />
}
