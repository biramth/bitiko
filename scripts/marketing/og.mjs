// Images de partage (1200×630) : accueil + une par page solution, composées avec les vraies captures de l'interface.
// Sortie : public/og/*.jpg  (WhatsApp, Facebook, LinkedIn, X les affichent quand on colle un lien).
// Usage : npm run marketing:og   (aucun serveur requis ; ffmpeg dans le PATH)
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '../..')
const OUT = path.join(root, 'public/og')
const TMP = path.join(import.meta.dirname, '.tmp-og')
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

const file = (relative) => pathToFileURL(path.join(root, relative)).href
const font = (family, weight, name) =>
  `@font-face{font-family:'${family}';font-weight:${weight};src:url('${file(`node_modules/@fontsource/${name.split('-')[0]}/files/${name}-latin-${weight}-normal.woff2`)}') format('woff2')}`

const CSS = `
${font('Sora', 700, 'sora')}${font('Sora', 600, 'sora')}${font('Inter', 400, 'inter')}${font('Inter', 500, 'inter')}${font('Inter', 600, 'inter')}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:Inter,sans-serif;color:#fff;
  background:radial-gradient(90% 120% at 100% 0%,#7a2c12 0%,rgba(122,44,18,0) 55%),radial-gradient(70% 90% at 0% 100%,#3a3384 0%,rgba(58,51,132,0) 60%),#17152e;position:relative}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(80% 80% at 30% 40%,#000 30%,transparent 100%)}
.left{position:absolute;left:64px;top:54px;bottom:54px;width:610px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:14px}
.brand img{width:52px;height:52px;border-radius:13px}
.brand b{font:700 32px Sora,sans-serif;letter-spacing:-.02em}
.eyebrow{margin-top:40px;font:600 15px Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#f2b705}
h1{margin-top:14px;font:700 __H1SIZE__px/1.08 Sora,sans-serif;letter-spacing:-.03em}
h1 em{font-style:normal;color:#f7a072}
.sub{margin-top:20px;font:400 24px/1.4 Inter,sans-serif;color:rgba(255,255,255,.78);max-width:560px}
.pills{margin-top:auto;display:flex;gap:10px;flex-wrap:wrap}
.pills span{padding:9px 18px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);font:500 17px Inter,sans-serif}
.pills span.cta{background:#c2481c;border-color:#c2481c;font-weight:600}
.browser{position:absolute;right:-60px;top:88px;width:560px;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 30px 70px rgba(0,0,0,.5);transform:rotate(-2deg)}
.browser .bar{height:24px;background:#f3ead9;display:flex;gap:6px;align-items:center;padding-left:12px}
.browser .bar i{width:8px;height:8px;border-radius:50%;background:#d9cbb2}
.browser img{display:block;width:100%}
.phone{position:absolute;right:250px;top:172px;width:232px;border-radius:34px;border:5px solid #17152e;overflow:hidden;background:#fff;box-shadow:0 30px 70px rgba(0,0,0,.55);transform:rotate(2deg)}
.phone img{display:block;width:100%}
`

function pageHtml({ eyebrow, title, sub, phone, browser, size }) {
  return `<!doctype html><meta charset="utf-8"><style>${CSS.replace('__H1SIZE__', String(size))}</style>
<body><div class="grid"></div>
<div class="left">
  <div class="brand"><img src="${file('public/icon-192.png')}" alt=""><b>Bitiko</b></div>
  <p class="eyebrow">${eyebrow}</p>
  <h1>${title}</h1>
  <p class="sub">${sub}</p>
  <div class="pills"><span class="cta">Gratuit pour démarrer</span><span>Zéro commission</span><span>bitiko.shop</span></div>
</div>
<div class="browser"><div class="bar"><i></i><i></i><i></i></div><img src="${file(`public/marketing/${browser}.webp`)}" alt=""></div>
<div class="phone"><img src="${file(`public/marketing/${phone}.webp`)}" alt=""></div>
</body>`
}

async function main() {
  // Les pages solutions sont lues à la source (TypeScript) : l'image dit exactement la même chose que la page.
  const server = await createServer({ configFile: false, root, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' })
  const { SOLUTION_PAGES } = await server.ssrLoadModule('/src/pages/marketing/solutions/data.ts')
  await server.close()

  const cards = [
    {
      name: 'home',
      eyebrow: 'Commerces et services d’Afrique de l’Ouest',
      title: 'Vends, réserve et gère ton activité. <em>Un seul outil.</em>',
      sub: 'Boutique en ligne, rendez-vous, réservation de tables et finances. Commandes sur WhatsApp.',
      phone: 'shop-boutique',
      browser: 'shop-dashboard',
      size: 50,
    },
    ...SOLUTION_PAGES.map((page) => ({
      name: `solutions-${page.slug}`,
      eyebrow: page.eyebrow,
      title: page.metaTitle.replace(/ \| Bitiko$/, ''),
      sub: page.lead.split('. ')[0].replace(/\.$/, '') + '.',
      phone: page.shots.find((s) => s.kind === 'phone')?.name ?? 'shop-boutique',
      browser: page.shots.find((s) => s.kind === 'browser')?.name ?? 'dashboard',
      size: 46,
    })),
  ]

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  for (const card of cards) {
    const html = path.join(TMP, `${card.name}.html`)
    writeFileSync(html, pageHtml(card))
    await page.goto(pathToFileURL(html).href)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(250)
    const png = path.join(TMP, `${card.name}.png`)
    await page.screenshot({ path: png })
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', '-pix_fmt', 'yuvj420p', path.join(OUT, `${card.name}.jpg`)])
    console.log('✓', card.name)
  }
  await browser.close()
  rmSync(TMP, { recursive: true, force: true })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
