// Prérendu des pages publiques de la plateforme (accueil, solutions, légales) : le HTML statique contient le contenu
// complet pour les robots qui n'exécutent pas le JavaScript. Étape de build, non bloquante : en cas d'échec, chaque
// page reçoit une copie de index.html (les réécritures de vercel.json pointent toujours vers un fichier existant).
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '../..')
const dist = path.join(root, 'dist')
const outDir = path.join(root, 'node_modules/.prerender')
const target = path.join(dist, 'prerendered')
const ORIGIN = 'https://bitiko.shop'

/** Noms de fichiers attendus par les réécritures de vercel.json (lus dans les données pour ne pas dériver). */
function expectedNames() {
  const names = ['home', 'legal-cgu', 'legal-confidentialite']
  const data = readFileSync(path.join(root, 'src/pages/marketing/solutions/data.ts'), 'utf8')
  for (const match of data.matchAll(/slug: '([a-z-]+)'/g)) names.push(`solutions-${match[1]}`)
  return names
}

async function main() {
  if (!existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html introuvable : lancer vite build avant.')
  const stub = (file) => path.join(root, 'scripts/prerender/stubs', file)

  await build({
    configFile: false,
    root,
    logLevel: 'warn',
    plugins: [react()],
    resolve: {
      alias: [
        { find: '@/lib/supabaseClient', replacement: stub('supabaseClient.ts') },
        { find: '@/hooks/usePageSeo', replacement: stub('usePageSeo.ts') },
        { find: '@/hooks/useJsonLd', replacement: stub('useJsonLd.ts') },
        { find: '@/hooks/useFaqStructuredData', replacement: stub('useFaqStructuredData.ts') },
        { find: '@/hooks/useSoftwareStructuredData', replacement: stub('useSoftwareStructuredData.ts') },
        { find: '@', replacement: path.join(root, 'src') },
      ],
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL ?? ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY ?? ''),
      'import.meta.env.VITE_ROOT_DOMAIN': JSON.stringify(process.env.VITE_ROOT_DOMAIN ?? ''),
      'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(''),
    },
    build: {
      ssr: path.join(root, 'scripts/prerender/entry.tsx'),
      outDir,
      emptyOutDir: true,
      rollupOptions: { output: { format: 'esm', entryFileNames: 'entry.mjs' } },
    },
  })

  const entry = await import(pathToFileURL(path.join(outDir, 'entry.mjs')).href)
  const template = readFileSync(path.join(dist, 'index.html'), 'utf8')
  mkdirSync(target, { recursive: true })

  let written = 0
  for (const page of entry.PAGES) {
    const { html, seo, jsonld } = entry.renderPage(page.path)
    if (!seo?.title || html.length < 500) throw new Error(`Rendu vide ou sans titre pour ${page.path}`)
    const output = entry.assemble(template, { html, seo, jsonLd: jsonld, fallbackCanonical: ORIGIN + page.path })
    writeFileSync(path.join(target, `${page.name}.html`), output)
    written += 1
  }
  console.log(`prerender: ${written} pages écrites dans dist/prerendered`)
}

main()
  .catch((error) => {
    console.warn('prerender: échec, repli sur index.html pour chaque page :', error instanceof Error ? error.message : error)
    try {
      mkdirSync(target, { recursive: true })
      for (const name of expectedNames()) copyFileSync(path.join(dist, 'index.html'), path.join(target, `${name}.html`))
    } catch (fallbackError) {
      console.warn('prerender: repli impossible :', fallbackError)
    }
  })
  .finally(() => {
    rmSync(outDir, { recursive: true, force: true })
    process.exit(0)
  })
