import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Deportistas CRUD.
 *
 * These tests require an authenticated Clerk session. Without a valid Clerk
 * test user session, the middleware redirects to /sign-in.
 *
 * To enable these tests:
 * 1. Configure Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Create a storageState fixture with a valid session for an admin user
 * 3. Reference the storageState in playwright.config.ts under `use.storageState`
 *
 * Until then all tests in this file are skipped to avoid false failures in CI.
 */

test.describe('Deportistas CRUD — Happy paths', () => {
  // Skip all tests until Clerk auth is configured
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('crear deportista con datos mínimos', async ({ page }) => {
    await page.goto('/deportistas');

    // Clicar botón Nuevo deportista
    await page.getByRole('link', { name: 'Nuevo deportista' }).click();
    await expect(page).toHaveURL('/deportistas/nuevo');

    // Completar tab Personal
    await page.getByLabel(/apellido/i).fill('Test');
    await page.getByLabel(/nombre \*/i).fill('E2E');
    await page.getByLabel(/DNI/i).fill('12345678');
    await page.getByLabel(/fecha de nacimiento/i).fill('2000-01-01');

    // Guardar
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Debe redirigir al detalle
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+$/);
    await expect(page.getByText('Test, E2E')).toBeVisible();

    // Navegar a la lista y verificar que aparece
    await page.goto('/deportistas');
    await expect(page.getByText('Test, E2E')).toBeVisible();
  });

  test('editar nombre de un deportista existente', async ({ page }) => {
    // Precondición: el deportista "Test, E2E" debe existir (creado en test anterior)
    await page.goto('/deportistas');

    // Buscar y clicar en el deportista
    await page.getByPlaceholder(/buscar/i).fill('Test');
    await page.keyboard.press('Enter');
    await page.getByText('Test, E2E').click();

    // Verificar que llegamos al detalle
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+$/);

    // Clicar Editar
    await page.getByRole('link', { name: 'Editar' }).click();
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+\/editar$/);

    // Cambiar nombre
    const nombreInput = page.getByLabel(/nombre \*/i);
    await nombreInput.clear();
    await nombreInput.fill('E2E-Editado');

    // Guardar
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Verificar cambio en el detalle
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+$/);
    await expect(page.getByText('Test, E2E-Editado')).toBeVisible();
  });

  test('eliminar deportista con confirmación', async ({ page }) => {
    // Precondición: el deportista "Test, E2E-Editado" debe existir
    await page.goto('/deportistas');

    // Clicar en el deportista
    await page.getByText('Test, E2E-Editado').click();
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+$/);

    // Clicar Eliminar
    await page.getByRole('button', { name: 'Eliminar' }).click();

    // El modal debe abrirse con el nombre
    await expect(page.getByTestId('delete-modal')).toBeVisible();
    await expect(page.getByText('Test, E2E-Editado')).toBeVisible();

    // Confirmar eliminación
    await page.getByRole('button', { name: /confirmar eliminación/i }).click();

    // Redirigir a la lista y el deportista no aparece
    await expect(page).toHaveURL('/deportistas');
    await expect(page.getByText('Test, E2E-Editado')).not.toBeVisible();
  });

  test('mostrar 404 para ID inexistente', async ({ page }) => {
    await page.goto('/deportistas/id-que-no-existe-12345');
    await expect(page.getByText(/deportista no encontrado/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /volver a la lista/i })).toBeVisible();
  });
});
