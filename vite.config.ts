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
  build: {
    // Fonts should stay as separate cacheable files, never inlined as
    // base64 into the JS/CSS bundle — matters a lot on the slower mobile
    // connections this app targets.
    assetsInlineLimit: 0,
  },
})
