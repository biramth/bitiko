import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentTenant } from '@/lib/tenant'
import type { Shop, TenantContext as TenantInfo } from '@/types'

interface TenantContextValue {
  tenant: TenantInfo
  shop: Shop | null
  isLoading: boolean
  notFound: boolean
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const tenant = getCurrentTenant()

  // shop.service pulls in supabase-js plus the onboarding/template graph —
  // dynamic-import it so the marketing landing page never downloads any of
  // that. The query only runs on shop subdomains anyway (enabled below).
  const { data: shop, isLoading } = useQuery({
    queryKey: ['tenant-shop', tenant],
    queryFn: () => import('@/services/shop.service').then((m) => m.getShopByTenant(tenant)),
    enabled: tenant.type === 'shop',
    staleTime: 5 * 60_000,
  })

  const value: TenantContextValue = {
    tenant,
    shop: shop ?? null,
    isLoading: tenant.type === 'shop' && isLoading,
    notFound: tenant.type === 'shop' && !isLoading && !shop,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within a TenantProvider')
  return ctx
}
