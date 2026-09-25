import { test, expect } from '@playwright/test'

/** Marketing surface: content reflects activities (not shops-only), SEO
 *  fundamentals are present, mobile has no horizontal overflow. */
test('landing renders the activity-centric content with SEO tags', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Bitiko.*activité/i)

  const description = await page.locator('meta[name="description"]').getAttribute('content')
  expect(description).toMatch(/activit|boutique| rendez-vous/i)

  // Structured data (FAQ + SoftwareApplication) — wait for each effect to flush
  // (injection happens in separate effects; attachment of the first script
  // proves nothing about the others).
  for (const marker of ['FAQPage', 'SoftwareApplication']) {
    await page.waitForFunction(
      (m) =>
        [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) =>
          (s.textContent ?? '').includes(m),
        ),
      marker,
      { timeout: 10_000 },
    )
  }
  const ldJson = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(ldJson.join(' ')).toMatch(/FAQPage/)
  expect(ldJson.join(' ')).toMatch(/SoftwareApplication/)

  // New-model copy.
  await expect(page.getByRole('heading', { name: /ton activité mérite mieux/i })).toBeVisible()
  await expect(page.getByText(/Coiffure & beauté/i).first()).toBeVisible()

  // Primary CTA goes to the entry point.
  const cta = page.getByRole('link', { name: /créer ma boutique gratuitement/i }).first()
  await expect(cta).toBeVisible()
  await expect(cta).toHaveAttribute('href', '/admin/login')
})

test('landing has no horizontal overflow on mobile', async ({ page }) => {
  await page.goto('/')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})
