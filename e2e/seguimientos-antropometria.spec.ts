import { test, expect } from '@playwright/test';

/**
 * E2E tests for the "Seguimiento Antropometría" feature.
 *
 * New follow-up type `ANTROPOMETRIA`, enabled for roles `nutricionista` and `admin`.
 * The form section captures básicos, perímetros and pliegues; the two sumatorias
 * (IMC and Sumatoria de Pliegues) are read-only and computed live on the client via
 * `computeAntropometriaSumatorias`, and recomputed/persisted server-side (source of truth).
 *
 * These tests require an authenticated Clerk session for role=nutricionista.
 * To enable them:
 * 1. Configure Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Create a storageState fixture with a valid session for:
 *    - PLAYWRIGHT_NUTRICIONISTA_EMAIL / PLAYWRIGHT_NUTRICIONISTA_PASSWORD
 *    - PLAYWRIGHT_MEDICO_EMAIL / PLAYWRIGHT_MEDICO_PASSWORD (para el gate por rol)
 * 3. Reference the storageState in playwright.config.ts under `use.storageState`.
 *
 * Until then, all tests in this file are skipped (same harness as the existing
 * seguimientos.spec.ts / seguimientos-personalizados.spec.ts) to avoid false
 * failures in CI — the middleware would otherwise redirect to /sign-in.
 *
 * Reference values used below (computed, not hardcoded blindly):
 * - IMC = peso / (talla_m)^2, rounded to 1 decimal.
 *     peso 70 kg, talla 175 cm -> 70 / (1.75^2) = 22.857... -> 22.9
 * - Sumatoria de Pliegues = suma de los 6 pliegues.
 *     10 + 8 + 6 + 12 + 9 + 7 = 52 mm
 *
 * QA checklist verified during implementation review (code review + unit/component tests):
 * - Tipo "Antropometría" aparece solo para nutricionista y admin (TIPOS_POR_ROL en form y action).
 * - Backend recalcula imc/sumatoriaPliegues server-side (buildAntropometriaPayload descarta
 *   los valores del cliente antes de persistir) — unit test cubre el cálculo puro.
 * - Rol-type check server-side en createSeguimiento y updateSeguimiento (no solo UI).
 * - Cambiar de ANTROPOMETRIA a otro tipo limpia la fila satélite (deleteOldSatellite / upsert).
 * - Sumatorias son read-only: renderizadas como <p>, sin input registrado (component test).
 * - Retrocompatibilidad: seguimientos GENERICO y otros tipos siguen funcionando.
 */

// Reference values (mirrored from computeAntropometriaSumatorias for determinism)
const PESO = 70;
const TALLA = 175;
const IMC_ESPERADO = Math.round((PESO / (TALLA / 100) ** 2) * 10) / 10; // 22.9
const PLIEGUES = {
  triceps: 10,
  subescapular: 8,
  supraespinal: 6,
  abdominal: 12,
  muslo: 9,
  pantorrilla: 7,
};
const SUMATORIA_ESPERADA = Object.values(PLIEGUES).reduce((a, b) => a + b, 0); // 52

test.describe('Seguimiento Antropometría — nutricionista', () => {
  test.skip(
    true,
    'Requires Clerk test user session for role=nutricionista (storageState not configured)',
  );

  test('happy path — nutricionista crea antropometría, sumatorias en vivo y persistencia', async ({
    page,
  }) => {
    await page.goto('/seguimientos/nuevo');

    // El selector de tipo está visible (nutricionista tiene GENERICO + ANTROPOMETRIA).
    // El trigger del CustomSelect muestra la opción actual (Genérico).
    const tipoTrigger = page.getByRole('button', { name: /Genérico/i });
    await expect(tipoTrigger).toBeVisible();
    await tipoTrigger.click();

    // La opción Antropometría existe para este rol; tipos ajenos NO.
    await expect(page.getByRole('button', { name: /^Antropometría$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Traumatolog/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Evaluación Psicológica/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Evaluación Cardiológica/i })).not.toBeVisible();

    // Seleccionar Antropometría — se monta la sección.
    await page.getByRole('button', { name: /^Antropometría$/i }).click();

    // Bloques visibles
    await expect(page.getByText('Básicos')).toBeVisible();
    await expect(page.getByText('Perímetros')).toBeVisible();
    await expect(page.getByText('Pliegues', { exact: true })).toBeVisible();
    await expect(page.getByText('Sumatorias (auto-calculadas)')).toBeVisible();

    // Deportista, fecha, título
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-07-20');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Antropometría inicial');

    // Básicos: peso y talla
    await page.locator('#antropometria_peso').fill(String(PESO));
    await page.locator('#antropometria_talla').fill(String(TALLA));

    // Verificar IMC calculado en vivo
    const imcCard = page.getByText('IMC', { exact: true }).locator('..').locator('..');
    await expect(imcCard.getByText(String(IMC_ESPERADO))).toBeVisible();

    // Pliegues (los 6)
    await page.locator('#antropometria_pliegueTriceps').fill(String(PLIEGUES.triceps));
    await page.locator('#antropometria_pliegueSubescapular').fill(String(PLIEGUES.subescapular));
    await page.locator('#antropometria_pliegueSupraespinal').fill(String(PLIEGUES.supraespinal));
    await page.locator('#antropometria_pliegueAbdominal').fill(String(PLIEGUES.abdominal));
    await page.locator('#antropometria_pliegueMuslo').fill(String(PLIEGUES.muslo));
    await page.locator('#antropometria_plieguePantorrilla').fill(String(PLIEGUES.pantorrilla));

    // Verificar Sumatoria de Pliegues calculada en vivo
    const sumaCard = page
      .getByText('Sumatoria de Pliegues', { exact: true })
      .locator('..')
      .locator('..');
    await expect(sumaCard.getByText(String(SUMATORIA_ESPERADA))).toBeVisible();

    // Las sumatorias no son editables: no existe input con esos ids
    await expect(page.locator('#antropometria_imc')).toHaveCount(0);
    await expect(page.locator('#antropometria_sumatoriaPliegues')).toHaveCount(0);

    // Guardar
    await page.getByText('Guardar seguimiento').click();
    await expect(page).toHaveURL('/seguimientos');

    // Badge de tipo en el listado
    await expect(page.getByText('Antropometría')).toBeVisible();

    // Abrir el detalle y verificar valores persistidos
    await page.getByText('Antropometría inicial').first().click();
    await expect(page).toHaveURL(/\/seguimientos\/.+/);

    // Sumatorias persistidas (recalculadas server-side)
    await expect(page.getByText('IMC', { exact: true })).toBeVisible();
    await expect(page.getByText(String(IMC_ESPERADO))).toBeVisible();
    await expect(page.getByText('Sumatoria de Pliegues')).toBeVisible();
    await expect(page.getByText(String(SUMATORIA_ESPERADA))).toBeVisible();

    // Bloques con mediciones persistidas
    await expect(page.getByText('Básicos')).toBeVisible();
    await expect(page.getByText('Pliegues', { exact: true })).toBeVisible();
    // Peso persistido visible en el bloque Básicos
    const basicosCard = page
      .getByText('Básicos')
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")]');
    await expect(basicosCard.getByText(String(PESO))).toBeVisible();
  });

  test('edge case — talla vacía no calcula IMC (muestra guion)', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    await page.getByRole('button', { name: /Genérico/i }).click();
    await page.getByRole('button', { name: /^Antropometría$/i }).click();

    // Solo peso, sin talla: IMC no debe calcularse
    await page.locator('#antropometria_peso').fill(String(PESO));

    const imcCard = page.getByText('IMC', { exact: true }).locator('..').locator('..');
    await expect(imcCard.getByText('—')).toBeVisible();

    // Sin pliegues, la sumatoria sigue en guion
    const sumaCard = page
      .getByText('Sumatoria de Pliegues', { exact: true })
      .locator('..')
      .locator('..');
    await expect(sumaCard.getByText('—')).toBeVisible();
  });

  test('mobile viewport — sección Antropometría usable sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/seguimientos/nuevo');

    await page.getByRole('button', { name: /Genérico/i }).click();
    await page.getByRole('button', { name: /^Antropometría$/i }).click();

    await expect(page.getByText('Básicos')).toBeVisible();
    await expect(page.locator('#antropometria_peso')).toBeVisible();
    await expect(page.getByText('Guardar seguimiento')).toBeVisible();

    // No debe haber scroll horizontal en mobile
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHScroll).toBe(false);
  });
});

test.describe('Seguimiento Antropometría — gate por rol', () => {
  test.skip(
    true,
    'Requires Clerk test user session for role=medico (storageState not configured)',
  );

  test('rol médico NO ve la opción Antropometría en el selector de tipo', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // El médico tiene otros tipos; abrir el selector.
    await page.getByRole('button', { name: /Genérico/i }).click();

    // Antropometría NO debe estar disponible para médico (restricción también server-side).
    await expect(page.getByRole('button', { name: /^Antropometría$/i })).not.toBeVisible();
  });
});
