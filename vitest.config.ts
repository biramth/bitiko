import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
    // Mirrors what src/lib/tenant.ts reads at module load so subdomain
    // resolution can be tested without a real .env. The Supabase values are
    // placeholders: unit tests never reach the network, but src/lib/supabaseClient.ts
    // throws at import when they are missing (CI has no .env).
    env: {
      VITE_ROOT_DOMAIN: 'bitiko.shop',
      VITE_DEV_SHOP_SLUG: 'demo',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})