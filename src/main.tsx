import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from '@/app/App'
import { AuthProvider } from '@/features/auth/AuthContext'
import { CartProvider } from '@/features/cart/CartContext'
import { TenantProvider } from '@/features/tenant/TenantContext'
import { queryClient } from '@/lib/queryClient'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <TenantProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </TenantProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
