// Captures d'écran réelles de l'interface (données fictives) → public/marketing/*.webp
// Usage : npm run marketing:shots   (le serveur Vite « marketing » doit tourner : npm run marketing:serve)
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const BASE = process.env.MARKETING_URL ?? 'http://localhost:5199'
const OUT = path.resolve(import.meta.dirname, '../../public/marketing')
const TMP = path.resolve(import.meta.dirname, '.tmp')
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

// Fenêtre compacte : une fois réduite dans la landing (~600 px), le texte de l'interface reste lisible.
const DESKTOP = { width: 960, height: 720 }
const MOBILE = { width: 390, height: 844 }

/** name, url, viewport, prépa optionnelle (page → Promise), clip optionnel. */
const shots = [
  { name: 'dashboard', url: '/admin', desktop: true, prepare: hideChecklist },
  { name: 'agenda', url: '/admin/rendez-vous', desktop: true },
  { name: 'horaires', url: '/admin/rendez-vous', desktop: true, prepare: revealHours },
  { name: 'prestations', url: '/admin/prestations', desktop: true },
  { name: 'equipe', url: '/admin/equipe', desktop: true },
  { name: 'bilan-pdf', url: '/admin/gestion/bilan?periode=this_month', desktop: true, prepare: hidePrintChrome },
  { name: 'boutique', url: '/?boutique=salon-awa', mobile: true },
  { name: 'reserver', url: '/reserver?boutique=salon-awa', mobile: true, prepare: fillBooking },
  { name: 'agenda-mobile', url: '/admin/rendez-vous', mobile: true },
  // Commerce : « Wax & Style by Fatou »
  { name: 'shop-dashboard', profile: 'boutique', url: '/admin', desktop: true, prepare: hideChecklist },
  { name: 'shop-produits', profile: 'boutique', url: '/admin/produits', desktop: true },
  { name: 'shop-commandes', profile: 'boutique', url: '/admin/commandes', desktop: true },
  { name: 'shop-clients', profile: 'boutique', url: '/admin/clients', desktop: true },
  { name: 'shop-finances', profile: 'boutique', url: '/admin/gestion', desktop: true },
  { name: 'shop-personnaliser', profile: 'boutique', url: '/admin/personnaliser', desktop: true },
  { name: 'shop-boutique', profile: 'boutique', url: '/?boutique=wax-style', mobile: true },
  { name: 'shop-catalogue', profile: 'boutique', url: '/catalogue?boutique=wax-style', mobile: true },
  { name: 'shop-produit', profile: 'boutique', url: '/produits/robe-wax-aminata?boutique=wax-style', mobile: true },
]

async function revealHours(page) {
  await page.getByRole('button', { name: 'Modifier' }).first().click()
  await page.waitForTimeout(400)
  await page.evaluate(() => document.getElementById('booking-hours')?.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(400)
}

/** Le bandeau « Pour bien démarrer » n'a pas sa place sur un visuel d'une boutique déjà lancée. */
async function hideChecklist(page) {
  await page.evaluate(() => {
    for (const h2 of document.querySelectorAll('h2')) {
      if (h2.textContent?.includes('Pour bien démarrer')) h2.parentElement?.parentElement?.remove()
    }
  })
}

/** Le bilan imprimable s'affiche sans le bouton Imprimer, comme sur la feuille. */
async function fillBooking(page) {
  const select = page.locator('select').first()
  await select.selectOption(await select.locator('option', { hasText: 'Soin visage' }).getAttribute('value'))
  const date = new Date(Date.now() + 2 * 86400000)
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  await page.locator('input[type="date"]').fill(iso)
  await page.waitForTimeout(900)
  await page.evaluate(() => document.activeElement?.blur())
}

async function hidePrintChrome(page) {
  await page.emulateMedia({ media: 'print' })
  await page.setViewportSize({ width: 720, height: 820 })
}

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(700)
}

async function main() {
  const browser = await chromium.launch()
  const only = process.argv[2]
  for (const shot of shots) {
    if (only && shot.name !== only) continue
    for (const kind of ['desktop', 'mobile']) {
      if (!shot[kind]) continue
      const viewport = kind === 'desktop' ? DESKTOP : MOBILE
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: kind === 'mobile' ? 2 : 1.5,
        locale: 'fr-FR',
        timezoneId: 'Africa/Dakar',
        isMobile: kind === 'mobile',
        hasTouch: kind === 'mobile',
      })
      await context.addInitScript((profile) => {
        localStorage.setItem('mock_profile', profile)
        localStorage.setItem('mock_plan', 'pro')
        localStorage.setItem('bitiko_cookie_consent', 'refused')
      }, shot.profile ?? 'salon')
      const page = await context.newPage()
      await page.goto(BASE + shot.url)
      await settle(page)
      if (shot.prepare) await shot.prepare(page)
      const png = path.join(TMP, `${shot.name}.png`)
      await page.screenshot({ path: png })
      const webp = path.join(OUT, `${shot.name}.webp`)
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-c:v', 'libwebp', '-quality', '82', webp])
      console.log('✓', shot.name)
      await context.close()
    }
  }
  await browser.close()
  if (!process.env.MARKETING_KEEP_TMP) rmSync(TMP, { recursive: true, force: true })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
