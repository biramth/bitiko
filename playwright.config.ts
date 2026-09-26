import { defineConfig, devices } from '@playwright/test'

/**
 * E2E suite (DEV ONLY — see e2e/README.md). Runs the Vite dev server on a
 * dedicated port (5174, to never clash with `npm run dev`) in `e2e` mode,
 * which loads .env.e2e.local (dev Supabase project — NEVER production).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx vite --port 5174 --mode e2e',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
