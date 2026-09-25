import { test, expect } from '@playwright/test'
import { createTestUser, deleteTestUser, loginThroughUI, submitLogin } from './fixtures'

test('protected admin redirects to login when signed out', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('login rejects a wrong password with an error', async ({ page }) => {
  const user = await createTestUser('wrongpwd')
  try {
    await submitLogin(page, user.email, 'Mauvais-mot-de-passe-1!')
    await expect(page.getByText(/incorrect|invalide|erreur/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/admin\/login/)
  } finally {
    await deleteTestUser(user)
  }
})

test('login works with valid credentials', async ({ page }) => {
  const user = await createTestUser('login')
  try {
    await loginThroughUI(page, user)
    // Fresh user without shop lands on onboarding (or dashboard for staff).
    await expect(page).not.toHaveURL(/\/admin\/login/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/(admin\/onboarding|admin$|plateforme)/, { timeout: 15_000 })
  } finally {
    await deleteTestUser(user)
  }
})
