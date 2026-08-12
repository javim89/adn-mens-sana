import { test, expect } from '@playwright/test';

/**
 * E2E happy-path for the Convocatorias module.
 *
 * These tests require an authenticated Clerk session with role `admin` or
 * `entrenador`. Without a valid Clerk test-user session the middleware
 * redirects to /sign-in, so — matching the existing e2e suite
 * (presentismo.spec.ts, seguimientos.spec.ts, deportistas.spec.ts) — the
 * authenticated flow is skipped by default to avoid false failures in CI.
 *
 * To enable this test:
 * 1. Configure Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Create a storageState fixture with a session for an `entrenador` (or admin).
 * 3. Reference the storageState in playwright.config.ts under `use.storageState`.
 * 4. Seed a disciplina + categoría with a future EventoTorneo (PROGRAMADO) and
 *    >= 1 ACTIVO deportista in that disciplina/categoría.
 *
 * Then remove the `test.skip(...)` line in the describe block below.
 *
 * Run only this file:  npx playwright test e2e/convocatorias.spec.ts
 */

test.describe('Convocatorias — happy path (entrenador)', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('crear convocatoria eligiendo partido y plantel, y verla en el listado', async ({
    page,
  }) => {
    await page.goto('/convocatorias/nueva');

    // Card 1 — Partido: disciplina -> categoría (cascada)
    await page.getByText('Seleccionar disciplina...').click();
    await page.getByRole('option').first().click();
    await page.getByText('Seleccionar categoría...').click();
    await page.getByRole('option').first().click();

    // Aparece el card del próximo partido
    await expect(page.getByText('Próximo partido')).toBeVisible();

    // Se carga el plantel: convocar al primer deportista
    const primeraFila = page.getByRole('listitem').first();
    await primeraFila.getByRole('checkbox').check();

    // El contador refleja al menos 1 convocado
    await expect(page.getByText(/Convocados:\s*1\s*\//)).toBeVisible();

    // Guardar
    await page.getByRole('button', { name: /guardar convocatoria/i }).click();

    // Redirige al listado
    await page.waitForURL('**/convocatorias');
    await expect(
      page.getByRole('heading', { name: /convocatorias/i }),
    ).toBeVisible();
  });
});

/**
 * Auth-gate check: an unauthenticated user hitting /convocatorias is redirected
 * to /sign-in. Mirrors auth-redirect.spec.ts / presentismo.spec.ts. This
 * requires a dev server with valid Clerk publishable/secret keys; without them
 * the /sign-in redirect never settles, so it is skipped by default to avoid
 * false failures.
 */
test.describe('Convocatorias — auth gate', () => {
  test.skip(
    !process.env.CLERK_SECRET_KEY,
    'Requires a dev server configured with Clerk keys',
  );

  test('acceso no autenticado a /convocatorias redirige a /sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/convocatorias');
    await page.waitForURL('**/sign-in**');
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });
});
