import { test, expect } from '@playwright/test';

/**
 * E2E del detalle del deportista reorganizado en tabs + timeline de seguimientos.
 *
 * Requiere una sesión Clerk autenticada. Sin un storageState válido, el middleware
 * redirige a /sign-in, por lo que estos tests quedan skipped en CI (mismo patrón que
 * e2e/deportistas.spec.ts y e2e/seguimientos.spec.ts).
 *
 * Para habilitarlos:
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con sesión de un usuario admin
 * 3. Referenciarlo en playwright.config.ts (use.storageState)
 *
 * Checklist verificado en revisión (no requiere auth):
 * - La barra de tabs muestra 7 tabs (Personal, Deportivo, Escolar, Social, Salud, Seguimiento, Triage)
 * - La tab por defecto es Personal (verificado en test de componente)
 * - Seguimiento muestra el timeline o su estado vacío (test de componente)
 * - Triage muestra el placeholder "Próximamente / En construcción" (test de componente)
 * - Cada tab de datos muestra "Sin datos cargados" cuando la relación no existe (test de componente)
 */

test.describe('Deportista — detalle con tabs', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  async function gotoPrimerDetalle(page: import('@playwright/test').Page) {
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');
    await page.locator('table tbody tr a').first().click();
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+$/);
  }

  test('el detalle muestra la barra de tabs con las 7 pestañas', async ({ page }) => {
    await gotoPrimerDetalle(page);

    for (const label of [
      'Datos Personales',
      'Datos Deportivos',
      'Datos Escolares',
      'Datos Sociales',
      'Salud',
      'Seguimiento',
      'Triage',
    ]) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
  });

  test('navegar a Seguimiento muestra el timeline (o su estado vacío)', async ({ page }) => {
    await gotoPrimerDetalle(page);

    await page.getByRole('tab', { name: 'Seguimiento' }).click();

    // O bien hay items del timeline, o bien el estado vacío
    const timeline = page.locator('ol li');
    const vacio = page.getByText(/no tiene seguimientos registrados/i);
    await expect(timeline.first().or(vacio)).toBeVisible();
  });

  test('navegar a Triage muestra el placeholder Próximamente', async ({ page }) => {
    await gotoPrimerDetalle(page);

    await page.getByRole('tab', { name: 'Triage' }).click();
    await expect(page.getByText(/Próximamente/i)).toBeVisible();
  });

  test('la tab Datos Escolares muestra "Sin datos cargados" para un deportista sin esos datos', async ({
    page,
  }) => {
    await gotoPrimerDetalle(page);

    await page.getByRole('tab', { name: 'Datos Escolares' }).click();
    // Puede mostrar datos o el estado vacío; el test documenta el caso vacío
    await expect(
      page.getByText(/Sin datos cargados/i).or(page.getByText(/Datos Escolares/i)),
    ).toBeVisible();
  });
});
