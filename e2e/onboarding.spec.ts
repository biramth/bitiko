import { test, expect } from '@playwright/test'
import { createTestUser, deleteTestUser, loginThroughUI } from './fixtures'

/**
 * Core journey: signup-less fresh user (created via admin API) logs in,
 * completes onboarding (activity → offer → storefront → details → recap),
 * lands on a capability-generated workspace, then everything is cleaned up.
 * Runs on DEV only.
 */
test('full onboarding journey creates a shop and a workspace', async ({ page }) => {
  const user = await createTestUser('onboarding')
  const slug = `e2e-${Date.now().toString(36)}`
  try {
    await loginThroughUI(page, user)
    await page.goto('/admin/onboarding')
    await expect(page.getByText(/quelle est votre activité|créez votre boutique|étape 1/i).first()).toBeVisible({ timeout: 15_000 })

    // Step 1 — Boutique.
    await page.locator('#shopName').fill('E2E Boutique')
    await page.locator('#slug').fill(slug)
    await page.locator('#whatsapp').fill('770000000')
    await page.getByRole('button', { name: /suivant/i }).click()

    // Step 2 — Commerce (activity picker, DB-driven with legacy fallback).
    await page.getByRole('button', { name: /mode/i }).first().click()
    await page.getByRole('button', { name: /suivant/i }).click()

    // Step 3 — Vitrine (description required).
    await page.locator('#shopDescription').fill('Boutique de test automatisé E2E.')
    await page.getByRole('button', { name: /suivant/i }).click()

    // Step 4 — Coordonnées.
    await page.locator('#firstName').fill('Awa')
    await page.locator('#lastName').fill('Test')
    await page.locator('#personalPhone').fill('770000001')
    await page.getByRole('button', { name: /suivant/i }).click()

    // Step 5 — Récap → create.
    await page.getByRole('button', { name: /confirmer et créer ma boutique/i }).click()
    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 })

    // Capability-generated workspace: commerce modules visible.
    await expect(page.getByRole('link', { name: /commandes/i }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: /produits/i }).first()).toBeVisible()
  } finally {
    await deleteTestUser(user)
  }
})
