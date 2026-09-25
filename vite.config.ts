import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  define: {
    // Vercel injects VERCEL_ENV ('production' | 'preview' | 'development')
    // as a build-time env var automatically, no project config needed —
    // but Vite only forwards VITE_-prefixed vars into client code, so it's
    // re-exposed under that name for src/lib/tenant.ts to branch on (a
    // preview deployment must never link/embed the production subdomain —
    // wrong code, and blocked by its CSP frame-ancestors allowlist anyway).
    'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV ?? ''),
  },
  build: {
    // Fonts should stay as separate cacheable files, never inlined as
    // base64 into the JS/CSS bundle — matters a lot on the slower mobile
    // connections this app targets.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // lucide-react ships one module per icon: without this, the landing
        // page (~30 icons) fans out into ~25 tiny single-icon chunks, i.e.
        // ~25 extra HTTP requests on the critical path. One chunk instead.
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) return 'lucide'
          return undefined
        },
      },
    },
  },
})
