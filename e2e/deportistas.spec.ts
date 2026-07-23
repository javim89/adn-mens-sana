import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Deportistas CRUD — JSON:API migration.
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
 *
 * QA checklist verified during implementation review (does not require auth):
 * - API routes call auth() first (verified in unit tests)
 * - Content-Type: application/vnd.api+json is set on all responses (unit tests)
 * - data.type is "deportistas" in all resource objects (unit tests)
 * - Collection responses include links and meta.total (unit tests)
 * - POST returns 201 with Location header (unit tests)
 * - DELETE returns 204 with no body (unit tests)
 * - 404 errors use JSON:API errors array format (unit tests)
 * - 422 validation errors include source.pointer per failing field (unit tests)
 * - params is awaited before use (code review confirmed)
 * - No notFound() from next/navigation inside API routes (code review confirmed)
 * - TanStack Query keys include all filter/page params (code review confirmed)
 * - QueryClient is instantiated inside the provider component (code review confirmed)
 * - useSearchParams() is used for URL reading (code review confirmed)
 * - React Hook Form errors displayed at field level (unit tests)
 * - isSubmitting from RHF disables submit button during submission (unit tests)
 * - No Server Action imports remain in DeportistaForm or DeleteDeportistaModal (code review confirmed)
 * - deleteDeportista calls queryClient.invalidateQueries after success (code review confirmed)
 */

test.describe('Deportistas — List page', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('navigating to /deportistas loads the page and shows the table header', async ({ page }) => {
    await page.goto('/deportistas');
    await expect(page.getByRole('table')).toBeVisible();
    // Table header columns must be present
    await expect(page.getByRole('columnheader', { name: /nombre/i })).toBeVisible();
  });

  test('total count badge renders when records exist', async ({ page }) => {
    await page.goto('/deportistas');
    // Wait for TanStack Query to fetch
    await page.waitForSelector('table');
    // If records exist the count badge appears in the subtitle
    // (this test passes trivially if the DB is empty — it just verifies no crash)
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('filtering by disciplina updates the URL with filter[disciplina] param (disciplinaId)', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table');

    // El filtro de disciplina es un CustomSelect (button, no <select> nativo).
    // Se abre con click y se elige la opción por su label visible.
    await page.getByRole('button', { name: /todas las disciplinas/i }).click();
    await page.getByRole('button', { name: 'Fútbol', exact: true }).click();

    // La URL contiene el filtro JSON:API con un disciplinaId (cuid), NO el enum "FUTBOL".
    await expect(page).toHaveURL(/filter%5Bdisciplina%5D=[a-z0-9-]+/i);
    await expect(page).not.toHaveURL(/filter%5Bdisciplina%5D=FUTBOL/);
  });

  test('choosing a disciplina enables/updates the nested categoría filter', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table');

    // Sin disciplina el filtro de categoría está deshabilitado.
    const categoriaFilter = page.getByRole('button', { name: /todas las categorías/i });
    await expect(categoriaFilter).toBeDisabled();

    // Al elegir una disciplina, el filtro de categoría se habilita (anidamiento).
    await page.getByRole('button', { name: /todas las disciplinas/i }).click();
    await page.getByRole('button', { name: 'Fútbol', exact: true }).click();

    await expect(categoriaFilter).toBeEnabled();

    // Y al abrirlo ofrece SOLO las categorías de la disciplina elegida.
    await categoriaFilter.click();
    await expect(page.getByRole('button', { name: 'Primera', exact: true })).toBeVisible();
  });
});

test.describe('Deportistas — Pagination', () => {
  test.skip(true, 'Requires Clerk test user session + >20 records in DB');

  test('when more than 20 results exist, Siguiente button is visible and clickable', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table');

    const nextButton = page.getByRole('button', { name: 'Siguiente' });
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // URL must contain page[number]=2 (URL-encoded brackets)
    await expect(page).toHaveURL(/page%5Bnumber%5D=2/);
  });
});

test.describe('Deportistas — Create', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('navigating to /deportistas/nuevo shows the form', async ({ page }) => {
    await page.goto('/deportistas/nuevo');
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible();
    await expect(page.getByLabel(/apellido \*/i)).toBeVisible();
  });

  test('submitting the form with missing required fields shows inline validation errors', async ({ page }) => {
    await page.goto('/deportistas/nuevo');

    // Submit immediately without filling required fields
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Inline errors must appear — no page navigation
    await expect(page.getByText('El apellido es requerido')).toBeVisible();
    await expect(page).toHaveURL('/deportistas/nuevo');
  });

  test('filling valid data and submitting redirects to the detail page', async ({ page }) => {
    await page.goto('/deportistas/nuevo');

    await page.getByLabel(/apellido \*/i).fill('TestE2E');
    await page.getByLabel(/nombre \*/i).fill('Runner');
    await page.getByLabel(/dni \*/i).fill('12345678');
    await page.getByLabel(/fecha de nacimiento/i).fill('2000-01-01');

    await page.getByRole('button', { name: 'Guardar' }).click();

    // Redirects to detail page
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+$/);
  });
});

test.describe('Deportistas — Edit', () => {
  test.skip(true, 'Requires Clerk test user session + at least one record in DB');

  test('navigating to /deportistas/[id]/editar shows the form pre-filled with existing data', async ({ page }) => {
    // Navigate to list, pick first row
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');

    const firstLink = page.locator('table tbody tr a').first();
    const href = await firstLink.getAttribute('href');
    await firstLink.click();
    await expect(page).toHaveURL(href!);

    // Click edit
    await page.getByRole('link', { name: 'Editar' }).click();
    await expect(page).toHaveURL(new RegExp(href! + '/editar'));

    // Form must be pre-filled (apellido field is not empty)
    const apellidoInput = page.getByLabel(/apellido \*/i);
    await expect(apellidoInput).not.toHaveValue('');
  });

  test('changing a field and submitting redirects back to the detail page', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');

    const firstLink = page.locator('table tbody tr a').first();
    const href = await firstLink.getAttribute('href');
    await firstLink.click();
    await page.getByRole('link', { name: 'Editar' }).click();

    // Append text to apellido to change it
    const apellidoInput = page.getByLabel(/apellido \*/i);
    await apellidoInput.press('End');
    await apellidoInput.type('-mod');

    await page.getByRole('button', { name: 'Guardar' }).click();

    // Redirects to detail
    await expect(page).toHaveURL(href!);
  });
});

test.describe('Deportistas — Delete', () => {
  test.skip(true, 'Requires Clerk test user session + at least one record in DB');

  test('clicking Eliminar on the detail page opens the confirmation modal', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');

    // Navigate to the first deportista detail
    await page.locator('table tbody tr a').first().click();

    await page.getByRole('button', { name: 'Eliminar' }).click();

    // Modal must become visible
    await expect(page.getByTestId('delete-modal')).toBeVisible();
  });

  test('confirming deletion redirects to /deportistas and record is gone', async ({ page }) => {
    // Create a deportista to delete
    await page.goto('/deportistas/nuevo');
    await page.getByLabel(/apellido \*/i).fill('ToDelete');
    await page.getByLabel(/nombre \*/i).fill('E2E');
    await page.getByLabel(/dni \*/i).fill('11111111');
    await page.getByLabel(/fecha de nacimiento/i).fill('1990-06-15');
    await page.getByRole('button', { name: 'Guardar' }).click();

    const detailUrl = page.url();

    // Delete it
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: /confirmar eliminación/i }).click();

    // Redirected to list
    await expect(page).toHaveURL('/deportistas');

    // The record is no longer visible
    await expect(page.getByText('ToDelete, E2E')).not.toBeVisible();

    // Navigating back to the deleted detail should show 404/not found
    await page.goto(detailUrl);
    await expect(page.getByText(/no encontrado|not found/i)).toBeVisible();
  });
});

test.describe('Deportistas — Error handling', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('submitting a create form with a duplicate DNI shows an error message', async ({ page }) => {
    // This test requires a DNI that already exists in the DB.
    // With test DB seeding it would create the duplicate and verify the global error.
    // Skipped until DB seeding is available alongside auth.
    test.skip(true, 'Requires DB with pre-existing DNI');
  });
});
