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

  test.skip('Admin puede seleccionar kinesiologo en el selector de cambio de rol', async ({ page }) => {
    // Requires: authenticated admin session
    await page.goto('/usuarios')
    await expect(page.getByText('Cambiar rol')).toBeVisible()
    const roleSelector = page.getByRole('combobox', { name: /cambiar rol/i }).first()
    await expect(roleSelector).toBeVisible()
    await roleSelector.selectOption('kinesiologo')
  })
})

test.describe('Usuarios — No-admin', () => {
  test.skip('No-admin no ve el botón "Nuevo usuario"', async ({ page }) => {
    // This test requires a storageState fixture with a non-admin role (entrenador, medico, kinesiologo, etc.)
    await page.goto('/usuarios')
    await expect(page.getByRole('button', { name: 'Nuevo usuario' })).not.toBeVisible()
  })

  test.skip('No-admin no ve la columna "Cambiar rol"', async ({ page }) => {
    // This test requires a storageState fixture with a non-admin role (entrenador, medico, kinesiologo, etc.)
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

test.describe('Usuarios — Disable / Delete / Reactivate', () => {
  test.skip('Admin puede deshabilitar un usuario activo', async ({ page }) => {
    await page.goto('/usuarios')
    // Assumes at least one active, non-disabled user (that is not the logged-in admin) exists
    const disableButton = page.getByRole('button', { name: /deshabilitar/i }).first()
    await expect(disableButton).toBeVisible()
    await disableButton.click()

    // Confirmation modal appears
    await expect(page.getByRole('dialog', { name: /deshabilitar usuario/i })).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: /deshabilitar/i }).click()

    // Toast confirms and badge updates
    await expect(page.getByText(/usuario deshabilitado/i)).toBeVisible()
    await expect(page.getByText('Deshabilitado')).toBeVisible()
  })

  test.skip('Admin puede reactivar un usuario deshabilitado', async ({ page }) => {
    await page.goto('/usuarios')
    // Assumes at least one disabled user exists
    const reactivateButton = page.getByRole('button', { name: /reactivar/i }).first()
    await expect(reactivateButton).toBeVisible()
    await reactivateButton.click()

    await expect(page.getByRole('dialog', { name: /reactivar usuario/i })).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: /reactivar/i }).click()

    await expect(page.getByText(/usuario reactivado/i)).toBeVisible()
    await expect(page.getByText('Activo')).toBeVisible()
  })

  test.skip('Admin puede eliminar un usuario activo', async ({ page }) => {
    await page.goto('/usuarios')
    const deleteButton = page.getByRole('button', { name: /eliminar/i }).first()
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    await expect(page.getByRole('dialog', { name: /eliminar usuario/i })).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: /eliminar/i }).click()

    await expect(page.getByText(/usuario eliminado/i)).toBeVisible()
  })

  test.skip('Admin puede eliminar (revocar) una invitación pendiente', async ({ page }) => {
    await page.goto('/usuarios')
    // Target a row with status "Pendiente" — assumes one exists
    const pendingRow = page.getByText('Pendiente').locator('../..')
    const deleteButton = pendingRow.getByRole('button', { name: /eliminar/i })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: /eliminar/i }).click()

    await expect(page.getByText(/invitación revocada/i)).toBeVisible()
  })

  test.skip('Admin NO puede deshabilitar su propia cuenta', async ({ page }) => {
    // The logged-in admin's row should not show a "Deshabilitar" button
    // This requires knowing the admin's name to identify their row
    await page.goto('/usuarios')
    // Implementation depends on test setup having a way to identify the current user's row
  })

  test.skip('Cancelar en modal de confirmación no realiza ninguna acción', async ({ page }) => {
    await page.goto('/usuarios')
    const disableButton = page.getByRole('button', { name: /deshabilitar/i }).first()
    await disableButton.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: /cancelar/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    // No toast should appear
    await expect(page.getByText(/usuario deshabilitado/i)).not.toBeVisible()
  })

  test.skip('No-admin no ve botones de deshabilitar ni eliminar', async ({ page }) => {
    // Requires storageState fixture with a non-admin role (entrenador, medico, kinesiologo, etc.)
    await page.goto('/usuarios')
    await expect(page.getByRole('button', { name: /deshabilitar/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /eliminar/i })).not.toBeVisible()
  })
})
