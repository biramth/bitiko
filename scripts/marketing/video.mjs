// Vidéo de démonstration : l'interface réelle (données fictives) pilotée par Playwright, sous-titrée,
// sans son. Sortie : public/marketing/demo.mp4 + demo-poster.webp
// Usage : npm run marketing:video   (le serveur « marketing » doit tourner : npm run marketing:serve)
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.MARKETING_URL ?? 'http://localhost:5199'
const OUT = path.resolve(import.meta.dirname, '../../public/marketing')
const TMP = path.resolve(import.meta.dirname, '.tmp-video')
const SIZE = { width: 1280, height: 720 }
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Curseur factice + sous-titre injectés dans chaque page (Playwright n'enregistre pas le pointeur). */
const OVERLAY = `
(() => {
  const start = () => {
    if (document.getElementById('__cursor')) return
    const style = document.createElement('style')
    style.textContent = \`
      #__cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
        transition:transform .7s cubic-bezier(.4,0,.2,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
      #__cursor.click svg{transform:scale(.82)}
      #__cursor svg{transition:transform .12s}
      #__caption{position:fixed;left:50%;bottom:34px;transform:translate(-50%,12px);z-index:2147483646;pointer-events:none;
        background:rgba(17,24,39,.94);color:#fff;font:600 21px/1.35 Inter,system-ui,sans-serif;padding:13px 26px;border-radius:999px;
        opacity:0;transition:opacity .35s,transform .35s;white-space:nowrap;box-shadow:0 8px 30px rgba(0,0,0,.28)}
      #__caption.on{opacity:1;transform:translate(-50%,0)}
    \`
    document.head.appendChild(style)
    const cursor = document.createElement('div')
    cursor.id = '__cursor'
    cursor.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.8L10.4 19z" fill="#fff" stroke="#111827" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    let pos = { x: 640, y: 380 }
    try { pos = JSON.parse(sessionStorage.getItem('__cursor') || 'null') || pos } catch {}
    cursor.style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px)'
    document.body.appendChild(cursor)
    const caption = document.createElement('div')
    caption.id = '__caption'
    document.body.appendChild(caption)
    window.__cursorTo = (x, y) => {
      cursor.style.transform = 'translate(' + x + 'px,' + y + 'px)'
      try { sessionStorage.setItem('__cursor', JSON.stringify({ x, y })) } catch {}
    }
    window.__press = () => { cursor.classList.add('click'); setTimeout(() => cursor.classList.remove('click'), 160) }
    window.__caption = (text) => {
      if (!text) { caption.classList.remove('on'); return }
      caption.textContent = text
      caption.classList.add('on')
    }
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start)
})()
`

async function newScene(browser, name, profile = 'salon') {
  const context = await browser.newContext({
    viewport: SIZE,
    locale: 'fr-FR',
    timezoneId: 'Africa/Dakar',
    recordVideo: { dir: path.join(TMP, name), size: SIZE },
  })
  await context.addInitScript((mockProfile) => {
    localStorage.setItem('mock_profile', mockProfile)
    localStorage.setItem('mock_plan', 'pro')
    localStorage.setItem('bitiko_cookie_consent', 'refused')
  }, profile)
  await context.addInitScript(OVERLAY)
  const page = await context.newPage()
  return { context, page, t0: Date.now(), name }
}

/** Ferme la scène et renvoie { file, trim } (secondes à couper au début, avant le premier rendu utile). */
async function endScene(scene, readyAt) {
  const video = scene.page.video()
  const length = (Date.now() - readyAt) / 1000
  await scene.context.close()
  return { file: await video.path(), trim: Math.max(0, (readyAt - scene.t0) / 1000 - 0.15), length }
}

const caption = (page, text) => page.evaluate((t) => window.__caption?.(t), text)

async function point(page, locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box) throw new Error('élément introuvable pour le curseur')
  const x = box.x + Math.min(box.width * 0.5, 120)
  const y = box.y + box.height * 0.5
  await page.evaluate(([px, py]) => window.__cursorTo?.(px, py), [x, y])
  await sleep(850)
}

async function tap(page, locator, { after = 700 } = {}) {
  await point(page, locator)
  await page.evaluate(() => window.__press?.())
  await locator.click()
  await sleep(after)
}

async function type(page, locator, text) {
  await point(page, locator)
  await locator.click()
  await locator.pressSequentially(text, { delay: 90 })
  await sleep(400)
}

async function settle(page, ms = 800) {
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {})
  await sleep(ms)
}

const CARD_STYLE = `
  #__cursor,#__caption{display:none}
  html,body{margin:0;height:100%;font-family:'Segoe UI',system-ui,-apple-system,sans-serif}
  body{display:grid;place-items:center;background:radial-gradient(120% 120% at 20% 10%,#e2552a 0%,#b83a16 45%,#111827 100%);color:#fff;text-align:center}
  .card{max-width:920px;padding:0 48px;animation:in .9s ease both}
  @keyframes in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  .logo{font:700 30px/1 'Segoe UI',system-ui,sans-serif;letter-spacing:-.02em;opacity:.95;margin-bottom:34px}
  h1{font:700 58px/1.1 'Segoe UI',system-ui,sans-serif;letter-spacing:-.03em;margin:0 0 22px}
  p{font:400 25px/1.45 'Segoe UI',system-ui,sans-serif;margin:0;opacity:.9}
  .pill{display:inline-block;margin-top:34px;background:#fff;color:#b83a16;font:700 24px/1 'Segoe UI',system-ui,sans-serif;padding:16px 30px;border-radius:999px}
`

async function cardScene(browser, name, html, hold) {
  const scene = await newScene(browser, name)
  const body = `<!doctype html><meta charset="utf-8"><style>${CARD_STYLE}</style>${html}`
  await scene.page.route('**/__card', (route) => route.fulfill({ contentType: 'text/html', body }))
  await scene.page.goto(BASE + '/__card')
  const readyAt = Date.now()
  await sleep(hold)
  return endScene(scene, readyAt)
}

const PHONE_STYLE = `
    html,body{margin:0;height:100%;font-family:'Segoe UI',system-ui,-apple-system,sans-serif}
    body{display:flex;align-items:center;justify-content:center;gap:90px;background:radial-gradient(120% 120% at 15% 10%,#1f2937 0%,#111827 60%,#0b1220 100%);color:#fff}
    .copy{width:470px}
    .step{display:inline-block;font:700 15px/1 'Segoe UI',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#fdba74;margin-bottom:18px}
    h2{font:700 46px/1.12 'Segoe UI',system-ui,sans-serif;letter-spacing:-.03em;margin:0 0 20px}
    p{font:400 22px/1.5 'Segoe UI',system-ui,sans-serif;margin:0;color:#cbd5e1}
    .phone{position:relative;width:372px;height:690px;border-radius:52px;background:#0b0f19;padding:12px;box-shadow:0 0 0 2px #334155,0 40px 90px rgba(0,0,0,.55)}
    .phone:before{content:'';position:absolute;top:18px;left:50%;width:96px;height:24px;margin-left:-48px;border-radius:14px;background:#0b0f19;z-index:2}
    iframe{width:100%;height:100%;border:0;border-radius:40px;background:#fff}
`

/** Ouvre la boutique dans un cadre de téléphone ; renvoie le pilote de la scène. */
async function openPhone(scene, { url, kicker, title, sub }) {
  const { page } = scene
  const html = `<!doctype html><meta charset="utf-8"><style>${PHONE_STYLE}</style>
  <div class="copy"><span class="step">${kicker}</span><h2 id="t">${title}</h2><p id="s">${sub}</p></div>
  <div class="phone"><iframe id="f" src="${BASE}${url}" title="Boutique"></iframe></div>`
  await page.route('**/__phone', (route) => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto(BASE + '/__phone')
  const frame = page.frameLocator('#f')
  await frame.locator('body').waitFor()
  await settle(page, 1800)
  const readyAt = Date.now()
  const inner = () => page.frames().find((f) => f !== page.mainFrame())
  const headline = (t, sub2) =>
    page.evaluate(([a, b]) => { document.getElementById('t').textContent = a; document.getElementById('s').textContent = b }, [t, sub2])
  return { frame, inner, headline, readyAt }
}

const isoDate = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Client d'une boutique : catalogue → fiche produit → panier. */
async function clientShopScene(browser) {
  const scene = await newScene(browser, 'client-shop', 'boutique')
  const { page } = scene
  const { frame, inner, headline, readyAt } = await openPhone(scene, {
    url: '/?boutique=wax-style',
    kicker: 'Côté client',
    title: 'Une vraie boutique, sur ton lien',
    sub: 'Tes clients parcourent ton catalogue depuis leur téléphone, à toute heure.',
  })
  await sleep(1000)
  await inner().evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }))
  await sleep(1700)
  await inner().evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await sleep(900)
  await headline('Un catalogue clair', 'Photos, prix, catégories, recherche : le client trouve vite ce qu’il cherche.')
  await tap(page, frame.getByRole('link', { name: /Catalogue/ }).first(), { after: 1600 })
  await settle(page, 500)
  await inner().evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }))
  await sleep(1500)
  await tap(page, frame.getByRole('link', { name: /Robe wax Aminata/ }).first(), { after: 1600 })
  await settle(page, 500)
  await headline('Il ajoute au panier', 'Le stock est vérifié en temps réel : plus de rupture surprise.')
  await tap(page, frame.getByRole('button', { name: /Ajouter/i }).first(), { after: 1400 })
  await tap(page, frame.getByRole('link', { name: /Panier/ }).first(), { after: 1600 })
  await settle(page, 500)
  await headline('Total et livraison calculés', 'Il choisit sa ville, le tarif s’applique, il paie en espèces ou en mobile money.')
  await sleep(2600)
  return endScene(scene, readyAt)
}

/** Scène client d'un salon : réservation d'un créneau. */
async function clientSalonScene(browser) {
  const scene = await newScene(browser, 'client-salon')
  const { page } = scene
  const { frame, inner, headline, readyAt } = await openPhone(scene, {
    url: '/?boutique=salon-awa',
    kicker: 'Côté client',
    title: 'Vos clients réservent en ligne',
    sub: 'Depuis leur téléphone, à toute heure, sur votre site.',
  })
  await sleep(1200)
  await inner().evaluate(() => window.scrollTo({ top: 520, behavior: 'smooth' }))
  await sleep(1600)
  await inner().evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await sleep(1000)
  await headline('Un créneau, en quelques touches', 'Le client choisit sa prestation, son jour et son horaire.')
  await tap(page, frame.getByRole('link', { name: /Prendre rendez-vous/ }).first(), { after: 1400 })
  await settle(page, 600)
  const select = frame.locator('select').first()
  await point(page, select)
  await select.selectOption(await select.locator('option', { hasText: 'Soin visage' }).getAttribute('value'))
  await sleep(900)
  await point(page, frame.locator('input[type="date"]'))
  await frame.locator('input[type="date"]').fill(isoDate(2))
  await sleep(1300)
  await headline('Seuls les créneaux libres sont proposés', 'Horaires du jour, pauses, congés : tout est déjà pris en compte.')
  await tap(page, frame.getByRole('radio', { name: '15:30' }), { after: 900 })
  await type(page, frame.locator('#book-name'), 'Fatou Ndiaye')
  await type(page, frame.locator('#book-phone'), '77 123 45 67')
  await headline('Et c’est envoyé', 'Le commerçant est prévenu par email et dans son tableau de bord.')
  await tap(page, frame.getByRole('button', { name: /Demander ce créneau/ }), { after: 2400 })
  return endScene(scene, readyAt)
}

async function openAdmin(scene, url = '/admin') {
  const { page } = scene
  await page.goto(BASE + url)
  await settle(page, 900)
  await page.evaluate(() => {
    for (const h2 of document.querySelectorAll('h2')) {
      if (h2.textContent?.includes('Pour bien démarrer')) h2.parentElement?.parentElement?.remove()
    }
  })
  return Date.now()
}

/** Commerçant d'une boutique : ventes, commandes, stock, vitrine, finances. */
async function merchantShopScene(browser) {
  const scene = await newScene(browser, 'merchant-shop', 'boutique')
  const { page } = scene
  const readyAt = await openAdmin(scene)

  await caption(page, 'Côté commerçant : tes ventes du jour en un coup d’œil')
  await sleep(3400)
  await caption(page, 'Chaque commande arrive triée par statut')
  await tap(page, page.getByRole('link', { name: 'Voir les commandes' }), { after: 1400 })
  await settle(page, 600)
  await sleep(2400)
  await tap(page, page.getByRole('button', { name: 'Confirmer', exact: true }).first(), { after: 1500 })
  await caption(page, 'Tu confirmes en un clic, puis tu préviens le client sur WhatsApp')
  await sleep(2600)

  await caption(page, 'Ton stock se met à jour à chaque vente, avec alertes')
  await tap(page, page.getByRole('link', { name: 'Produits' }).first(), { after: 1400 })
  await settle(page, 600)
  await sleep(3400)

  await caption(page, 'Une vitrine à tes couleurs, sans une ligne de code')
  await tap(page, page.getByRole('link', { name: 'Personnaliser' }).first(), { after: 1600 })
  await settle(page, 1500)
  await sleep(3600)

  await caption(page, 'Tes finances : ce que tu gagnes, ce qu’il te reste')
  await tap(page, page.getByRole('link', { name: 'Finances' }).first(), { after: 1000 })
  await settle(page, 700)
  await sleep(3400)
  await tap(page, page.getByRole('tab', { name: /Ce trimestre/ }), { after: 1200 })
  await caption(page, 'Compare avec la période précédente, télécharge ton bilan')
  await sleep(3200)
  await caption(page, null)
  await sleep(400)
  return endScene(scene, readyAt)
}

/** Commerçant d'un salon : agenda, horaires, prestations, finances. */
async function merchantSalonScene(browser) {
  const scene = await newScene(browser, 'merchant-salon')
  const { page } = scene
  const readyAt = await openAdmin(scene)

  await caption(page, 'Côté prestataire : votre journée en un coup d’œil')
  await sleep(3000)
  await caption(page, 'Les demandes arrivent dans votre agenda')
  await tap(page, page.getByRole('link', { name: 'Agenda du jour' }), { after: 1200 })
  await settle(page, 500)
  await sleep(2000)
  await tap(page, page.getByRole('button', { name: 'Confirmer', exact: true }).first(), { after: 1600 })
  await caption(page, 'Un clic pour confirmer, un clic pour prévenir le client')
  await sleep(2200)
  await tap(page, page.getByRole('button', { name: 'Mes horaires' }), { after: 1100 })
  await tap(page, page.getByRole('button', { name: 'Modifier' }).first(), { after: 900 })
  await caption(page, 'Des horaires différents chaque jour, avec pauses')
  await sleep(1500)
  await page.evaluate(() => document.getElementById('booking-hours')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  await sleep(2600)
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }))
  await sleep(1800)

  await caption(page, 'Vos prestations, vos prix, vos durées')
  await tap(page, page.getByRole('link', { name: 'Prestations' }).first(), { after: 1000 })
  await settle(page, 500)
  await sleep(3000)

  await caption(page, 'Rendez-vous terminés comptés automatiquement, bilan en PDF ou Excel')
  await tap(page, page.getByRole('link', { name: 'Finances' }).first(), { after: 1000 })
  await settle(page, 700)
  await sleep(3600)
  await caption(page, null)
  await sleep(400)
  return endScene(scene, readyAt)
}

const ALL = ['intro', 'chapter-shop', 'client-shop', 'merchant-shop', 'chapter-service', 'client-salon', 'merchant-salon', 'outro']

async function main() {
  const only = process.env.SCENES?.split(',').filter(Boolean)
  const wanted = (name) => !only || only.includes(name)
  const browser = await chromium.launch()
  const scenes = {}
  const run = async (name, fn) => {
    if (wanted(name)) scenes[name] = await fn()
  }

  await run('intro', () =>
    cardScene(browser, 'intro', `<div class="card"><div class="logo">Bitiko</div><h1>Votre activité, en ligne et bien tenue</h1><p>Boutique, rendez-vous, réservations et finances<br/>dans un seul outil, pensé pour l’Afrique de l’Ouest.</p></div>`, 4200),
  )
  await run('chapter-shop', () =>
    cardScene(browser, 'chapter-shop', `<div class="card"><div class="logo">1 / 2</div><h1>Vous vendez des produits</h1><p>Boutique en ligne, commandes, stock et livraison.</p></div>`, 2600),
  )
  await run('client-shop', () => clientShopScene(browser))
  await run('merchant-shop', () => merchantShopScene(browser))
  await run('chapter-service', () =>
    cardScene(browser, 'chapter-service', `<div class="card"><div class="logo">2 / 2</div><h1>Vous proposez des services</h1><p>Rendez-vous, horaires par jour et réservation de tables.</p></div>`, 2600),
  )
  await run('client-salon', () => clientSalonScene(browser))
  await run('merchant-salon', () => merchantSalonScene(browser))
  await run('outro', () =>
    cardScene(browser, 'outro', `<div class="card"><div class="logo">Bitiko</div><h1>Lancez votre espace en quelques minutes</h1><p>Gratuit pour démarrer. Sans carte bancaire. Zéro commission.</p><span class="pill">bitiko.shop</span></div>`, 4500),
  )
  await browser.close()

  const order = ALL.filter((name) => scenes[name])
  // Chaque scène est encodée seule (durée exacte mesurée), puis les clips sont assemblés sans ré-encodage.
  const clips = order.map((name) => {
    const part = scenes[name]
    const clip = path.join(TMP, `${name}.mp4`)
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-ss', part.trim.toFixed(2), '-i', part.file,
      '-vf', 'fps=30,scale=1280:720:flags=lanczos,setsar=1,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-an', clip,
    ])
    const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clip]).toString().trim())
    return { name, clip, seconds }
  })
  const list = path.join(TMP, 'clips.txt')
  writeFileSync(list, clips.map((c) => `file '${c.clip.replaceAll('\\', '/')}'`).join('\n'))
  const partial = !!only
  const mp4 = path.join(partial ? TMP : OUT, partial ? 'partial.mp4' : 'demo.mp4')
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', mp4])
  const duration = clips.reduce((sum, c) => sum + c.seconds, 0)
  console.log(partial ? '✓ partiel' : '✓ demo.mp4', duration.toFixed(1), 's')
  if (partial) return

  // Chapitres (début en secondes) pour les boutons de la landing.
  let cursor = 0
  const starts = {}
  clips.forEach((c) => {
    starts[c.name] = cursor
    cursor += c.seconds
  })
  const chapters = [
    { id: 'produits', label: 'Vendre des produits', start: Math.floor(starts['chapter-shop']) },
    { id: 'services', label: 'Proposer des services', start: Math.floor(starts['chapter-service']) },
  ]
  writeFileSync(
    path.resolve(import.meta.dirname, '../../src/pages/marketing/demoChapters.json'),
    JSON.stringify({ duration: Math.round(duration), chapters }, null, 2) + '\n',
  )

  // Affiche : une image du tableau de bord réel (début de la scène commerçant).
  const posterAt = starts['merchant-shop'] + 2
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', posterAt.toFixed(2), '-i', mp4, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80', path.join(OUT, 'demo-poster.webp')])
  console.log('✓ demo-poster.webp, chapitres', JSON.stringify(chapters))

  if (!process.env.MARKETING_KEEP_TMP) rmSync(TMP, { recursive: true, force: true })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
