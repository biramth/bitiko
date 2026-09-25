import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { DeferredThirdParty } from '@/components/DeferredThirdParty'
import { App } from '@/app/App'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/features/auth/AuthContext'
import { CartProvider } from '@/features/cart/CartContext'
import { TenantProvider } from '@/features/tenant/TenantContext'
import { queryClient } from '@/lib/queryClient'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/sora/latin-600.css'
import '@fontsource/sora/latin-700.css'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          {/* Router sits above Auth so AuthProvider can gate the supabase-js
              download on the current path (skipped on "/"). */}
          <BrowserRouter>
            <AuthProvider>
              <TenantProvider>
                <CartProvider>
                  <App />
                  <DeferredThirdParty />
                </CartProvider>
              </TenantProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </ToastProvider>
  </StrictMode>,
)
