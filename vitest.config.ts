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
    include: ['src/**/*.test.ts'],
    // Mirrors what src/lib/tenant.ts reads at module load so subdomain
    // resolution can be tested without a real .env.
    env: {
      VITE_ROOT_DOMAIN: 'bitiko.shop',
      VITE_DEV_SHOP_SLUG: 'demo',
    },
  },
})