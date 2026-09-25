import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import path from 'path'

/**
 * Injects connection + font preload hints into index.html at build time:
 * - preconnect to the Supabase origin (the landing promo RPC fires on load —
 *   Lighthouse estimates ~320 ms of LCP savings on slow 4G);
 * - preload for every emitted .woff2 (the H1/body text is the LCP element and
 *   today the fonts are only discovered after the CSS parses).
 * Hashed filenames are read from the bundle, so nothing is hardcoded.
 */
function perfHints(): Plugin {
  return {
    name: 'bitiko-perf-hints',
    transformIndexHtml(html, ctx) {
      const tags: { tag: string; attrs: Record<string, string>; injectTo: 'head-prepend' }[] = []
      const supabaseUrl = process.env.VITE_SUPABASE_URL
      if (supabaseUrl) {
        try {
          tags.push({
            tag: 'link',
            attrs: { rel: 'preconnect', href: new URL(supabaseUrl).origin, crossorigin: '' },
            injectTo: 'head-prepend',
          })
        } catch {
          // Invalid URL in env — skip the hint, never break the build.
        }
      }
      const bundle = ctx.bundle
      if (bundle) {
        for (const fileName of Object.keys(bundle)) {
          if (fileName.endsWith('.woff2')) {
            tags.push({
              tag: 'link',
              attrs: {
                rel: 'preload',
                as: 'font',
                type: 'font/woff2',
                crossorigin: '',
                href: `/${fileName}`,
              },
              injectTo: 'head-prepend',
            })
          }
        }
      }
      return { html, tags }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), perfHints()],
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
  server: {
    // Local /api/* are Vercel serverless functions (see AGENTS.md): they only
    // run under `vercel dev --listen 3001`, so forward them there instead of
    // serving Vite's SPA fallback (which would 404-as-HTML and break callers
    // parsing JSON, e.g. the login email check).
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
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
