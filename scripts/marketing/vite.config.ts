import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'path'

const repo = path.resolve(import.meta.dirname, '../..')

// Serveur Vite dédié aux visuels marketing : même application, mais le client Supabase
// est remplacé par un faux client alimenté de données fictives (voir mock/supabaseClient.ts).
export default defineConfig({
  root: repo,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@/lib/supabaseClient', replacement: path.resolve(import.meta.dirname, 'mock/supabaseClient.ts') },
      { find: '@', replacement: path.resolve(repo, 'src') },
    ],
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://mock.local'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('mock'),
    'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(''),
  },
  server: { port: 5199, strictPort: true, fs: { strict: false } },
  // Le film se tourne sur un build de production : navigation fluide, sans le chargement module par module du mode dev.
  build: { outDir: path.resolve(repo, 'node_modules/.marketing-dist'), emptyOutDir: true, assetsInlineLimit: 0 },
  preview: { port: 5199, strictPort: true },
  cacheDir: path.resolve(repo, 'node_modules/.vite-marketing'),
})
