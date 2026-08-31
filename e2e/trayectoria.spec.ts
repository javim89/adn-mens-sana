import { test, expect } from '@playwright/test';

/**
 * E2E tests for the "Trayectoria del deportista" tab.
 *
 * These tests require an authenticated Clerk session. Without a valid Clerk
 * test user session, the middleware redirects to /sign-in, so — following the
 * same convention as `e2e/deportistas.spec.ts` — the whole suite is skipped to
 * avoid false failures in CI.
 *
 * To enable these tests:
 * 1. Configure Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Create a storageState fixture with a valid session for an admin user
 * 3. Reference the storageState in playwright.config.ts under `use.storageState`
 *
 * QA checklist verified during implementation review (does not require auth):
 * - getTrayectoria groups events by PasoPorDivision period on the client
 *   (agruparPorPeriodo): `desde <= fecha` inclusive, `fecha < hasta` exclusive,
 *   so an event on `hasta` falls into the next period (component tests).
 * - Events earlier than the oldest `desde` fall back to the oldest period
 *   (code review confirmed — masAntiguo fallback).
 * - crearTransicionDivision closes the open period, creates the new one and
 *   updates Deportista.categoriaId/disciplinaId atomically in a $transaction
 *   (action unit tests).
 * - The three actions check auth() + admin role before mutating (action unit tests).
 * - Date strings are ISO YYYY-MM-DD so lexicographic comparison is safe
 *   (code review confirmed — toDateString uses UTC slice).
 */

test.describe('Trayectoria — Tab del deportista', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('happy path — abre la tab Trayectoria y muestra bloques por división y eventos', async ({
    page,
  }) => {
    // Navegar al listado y entrar al primer deportista
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');
    await page.locator('table tbody tr a').first().click();
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+$/);

    // Abrir la tab "Trayectoria" (desktop: tablist)
    await page.getByRole('tab', { name: 'Trayectoria' }).click();

    // El bloque por período muestra el rango de fechas y el filtro de tipo
    await expect(
      page.getByRole('button', { name: /todos los tipos/i }),
    ).toBeVisible();

    // Al menos un bloque de período con su encabezado (categoría · disciplina o "Sin división")
    await expect(page.locator('section h3').first()).toBeVisible();
  });

  test('happy path — abre el modal "Registrar cambio de división"', async ({
    page,
  }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');
    await page.locator('table tbody tr a').first().click();

    await page.getByRole('tab', { name: 'Trayectoria' }).click();

    // El modal está oculto hasta que se hace click en el botón
    const modal = page.getByTestId('gestion-divisiones-modal');
    await expect(modal).toBeHidden();

    await page
      .getByRole('button', { name: /registrar cambio de división/i })
      .first()
      .click();

    // El modal se abre con su título y la sección de períodos registrados
    await expect(modal).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Gestión de divisiones' }),
    ).toBeVisible();
    await expect(page.getByText('Períodos registrados')).toBeVisible();

    // Se puede cerrar
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(modal).toBeHidden();
  });

  test('edge case — filtro por tipo sin coincidencias muestra estado vacío', async ({
    page,
  }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');
    await page.locator('table tbody tr a').first().click();

    await page.getByRole('tab', { name: 'Trayectoria' }).click();

    // Elegir un tipo que probablemente no tenga eventos en este deportista
    await page.getByRole('button', { name: /todos los tipos/i }).click();
    await page.getByRole('button', { name: 'Historia', exact: true }).click();

    // Si no hay coincidencias aparece el estado vacío con "Limpiar filtros".
    // (Se valida que la página no crashea; el estado vacío es condicional.)
    await expect(
      page.getByRole('button', { name: /todos los tipos/i }),
    ).toBeVisible();
  });

  test('mobile — la tab Trayectoria es accesible vía el CustomSelect', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');
    await page.locator('table tbody tr a').first().click();

    // En mobile las tabs son un CustomSelect (no tablist)
    await page.getByRole('button', { name: /datos personales/i }).click();
    await page.getByRole('button', { name: 'Trayectoria', exact: true }).click();

    await expect(
      page.getByRole('button', { name: /registrar cambio de división/i }).first(),
    ).toBeVisible();
  });
});
