import { test, expect } from '@playwright/test';

/**
 * E2E happy-path for the Presentismo (asistencia a entrenamientos) module.
 *
 * These tests require an authenticated Clerk session with role `admin` or
 * `entrenador`. Without a valid Clerk test-user session the middleware
 * redirects to /sign-in, so — matching the existing e2e suite
 * (seguimientos.spec.ts, deportistas.spec.ts) — the authenticated flow is
 * skipped by default to avoid false failures in CI.
 *
 * To enable this test:
 * 1. Configure Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Create a storageState fixture with a session for an `entrenador` (or admin).
 * 3. Reference the storageState in playwright.config.ts under `use.storageState`.
 * 4. Seed at least one disciplina + categoría with >= 1 ACTIVO deportista
 *    (see scripts/ seed helpers used by turnos/seguimientos).
 *
 * Then remove the `test.skip(...)` line in the describe block below.
 *
 * Run only this file:  npx playwright test e2e/presentismo.spec.ts
 */

test.describe('Presentismo — happy path (entrenador)', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('crear entrenamiento con un ausente y verlo en el listado', async ({ page }) => {
    await page.goto('/presentismo/nuevo');

    // Card 1 — Datos del entrenamiento
    await page.getByLabel(/Fecha/).fill('2026-08-10');

    // Tipo de sesión (CustomSelect)
    await page.getByText('Seleccionar tipo...').click();
    await page.getByRole('option', { name: 'Técnico' }).click();

    // Card 2 — Presentismo: disciplina -> categoría (cascada)
    await page.getByText('Seleccionar disciplina...').click();
    await page.getByRole('option').first().click();
    await page.getByText('Seleccionar categoría...').click();
    await page.getByRole('option').first().click();

    // Se carga el plantel: marcar el primer deportista como Ausente
    const primeraFila = page.getByRole('listitem').first();
    await primeraFila.getByRole('radio', { name: 'Ausente' }).click();
    await expect(primeraFila.getByRole('radio', { name: 'Ausente' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Guardar
    await page.getByRole('button', { name: /guardar entrenamiento/i }).click();

    // Redirige al listado y el nuevo entrenamiento aparece
    await page.waitForURL('**/presentismo');
    await expect(page.getByText('2026-08-10')).toBeVisible();
  });
});

/**
 * Auth-gate check: an unauthenticated user hitting /presentismo is redirected
 * to /sign-in. Mirrors auth-redirect.spec.ts. This requires a dev server with
 * valid Clerk publishable/secret keys; without them the /sign-in redirect never
 * settles (same behaviour as the existing auth-redirect.spec.ts in this env),
 * so it is skipped by default to avoid false failures.
 */
test.describe('Presentismo — auth gate', () => {
  test.skip(
    !process.env.CLERK_SECRET_KEY,
    'Requires a dev server configured with Clerk keys',
  );

  test('acceso no autenticado a /presentismo redirige a /sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/presentismo');
    await page.waitForURL('**/sign-in**');
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });
});
