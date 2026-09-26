import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

export interface E2EUser {
  email: string
  password: string
  id: string
}

function serviceClient() {
  const url = process.env.E2E_SUPABASE_URL
  const serviceKey = process.env.E2E_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'E2E_SUPABASE_URL and E2E_SERVICE_ROLE_KEY must be set (dev project only — never production). See e2e/README.md.',
    )
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

/** Creates a confirmed test user on DEV (deleted in teardown). */
export async function createTestUser(tag: string): Promise<E2EUser> {
  const stamp = Date.now().toString(36)
  const email = `e2e-${tag}-${stamp}@bitiko-e2e.test`
  const password = `E2e-${stamp}-xQ!`
  const admin = serviceClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  return { email, password, id: data.user.id }
}

/** Deletes the test user AND every shop they own (RLS owner-cascade covers the rest). */
export async function deleteTestUser(user: E2EUser): Promise<void> {
  const admin = serviceClient()
  await admin.from('shops').delete().eq('owner_id', user.id)
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) throw new Error(`deleteUser failed: ${error.message}`)
}

/** Real login flow through the UI (email step, then password step). */
export async function loginThroughUI(page: Page, user: E2EUser, password?: string): Promise<void> {
  await page.goto('/admin/login')
  await page.locator('#email').fill(user.email)
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.locator('#password').fill(password ?? user.password)
  await page.locator('button[type="submit"]').last().click()
}

/** Same flow but stays on the page (for asserting post-submit states). */
export async function submitLogin(page: Page, email: string, pwd: string): Promise<void> {
  await page.goto('/admin/login')
  await page.locator('#email').fill(email)
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.locator('#password').fill(pwd)
  await page.locator('button[type="submit"]').last().click()
}
