import { test, expect } from '@playwright/test'

/**
 * E2E tests for the Usuarios module.
 *
 * These tests require an authenticated Clerk session. Without a valid Clerk
 * test user session the middleware redirects to /sign-in, causing all
 * assertions against /usuarios to fail.
 *
 * To enable these tests:
 * 1. Configure Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Create a storageState fixture with a valid session for an admin user
 * 3. Reference the storageState in playwright.config.ts under `use.storageState`
 *
 * Until then all tests in this file are skipped to avoid false failures in CI.
 */

test.describe('Usuarios — Admin', () => {
  test.skip('Admin puede ver la lista de usuarios', async ({ page }) => {
    await page.goto('/usuarios')
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test.skip('Admin puede abrir modal y enviar invitación', async ({ page }) => {
    await page.goto('/usuarios')
    await page.getByRole('button', { name: 'Nuevo usuario' }).click()
    await expect(page.getByRole('dialog', { name: 'Invitar usuario' })).toBeVisible()

    await page.getByLabel('Nombre').fill('Juan')
    await page.getByLabel('Apellido').fill('Pérez')
    await page.getByLabel('Email').fill('juan.perez@gimnasia.org.ar')
    await page.getByLabel('Rol').selectOption('entrenador')
    await page.getByRole('button', { name: 'Enviar invitación' }).click()

    await expect(page.getByText(/invitación enviada/i)).toBeVisible()
  })

  test.skip('Admin puede reenviar una invitación pendiente', async ({ page }) => {
    await page.goto('/usuarios')
    // Assumes at least one pending invitation exists in the test account
    const resendButton = page.getByRole('button', { name: /reenviar/i }).first()
    await expect(resendButton).toBeVisible()
    await resendButton.click()
    // No error toast should appear; button returns to enabled state
    await expect(resendButton).toBeEnabled()
  })

  test.skip('Admin puede cambiar el rol de un usuario activo', async ({ page }) => {
    await page.goto('/usuarios')
    await expect(page.getByText('Cambiar rol')).toBeVisible()
    const roleSelector = page.getByRole('combobox', { name: /cambiar rol/i }).first()
    await expect(roleSelector).toBeVisible()
    await roleSelector.selectOption('medico')
  })
})

test.describe('Usuarios — No-admin', () => {
  test.skip('No-admin no ve el botón "Nuevo usuario"', async ({ page }) => {
    // This test requires a storageState fixture with an entrenador or medico session
    await page.goto('/usuarios')
    await expect(page.getByRole('button', { name: 'Nuevo usuario' })).not.toBeVisible()
  })

  test.skip('No-admin no ve la columna "Cambiar rol"', async ({ page }) => {
    // This test requires a storageState fixture with an entrenador or medico session
    await page.goto('/usuarios')
    await expect(page.getByText('Cambiar rol')).not.toBeVisible()
  })
})

test.describe('Usuarios — Auth gate', () => {
  test.skip('Unauthenticated user is redirected to /sign-in', async ({ page }) => {
    await page.goto('/usuarios')
    await expect(page).toHaveURL(/sign-in/)
  })
})

test.describe('Usuarios — Mobile viewport', () => {
  test.skip('Lista de usuarios es legible en mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/usuarios')
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })
})
