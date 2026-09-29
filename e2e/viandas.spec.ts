import { test, expect } from '@playwright/test';

/**
 * Happy path del módulo de Viandas — REQUIERE SESIÓN.
 *
 * Skippeado porque el proyecto todavía no tiene `storageState` ni `@clerk/testing`
 * configurados. Para habilitarlo:
 *
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con sesión de un usuario `role = admin`
 *    (PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD), y otro con
 *    `role = responsable_viandas` + `lugarRetiro = BOSQUESITO`.
 * 3. Referenciarlos en playwright.config.ts bajo `use.storageState`.
 * 4. Seedear una disciplina + categoría con, al menos: un deportista que no
 *    reciba vianda, uno con solo almuerzo, uno con solo cena, uno con ambas, y
 *    uno con estado distinto de ACTIVO.
 */
const MOTIVO = 'Requiere sesión de Clerk con rol admin (storageState sin configurar)';

test.describe('Viandas — registro del día', () => {
  test('el admin ve todo el plantel con su tag de elegibilidad', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto('/viandas?lugar=SEDE');
    // Todos los deportistas de la categoría, reciban vianda o no.
    await expect(page.getByText('No recibe vianda').first()).toBeVisible();
    await expect(page.getByRole('group', { name: /resumen por comida/i })).toBeVisible();
  });

  test('marcar un retiro lo deja registrado con lugar y hora', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto('/viandas?lugar=SEDE');
    const celda = page.getByRole('switch', { name: /desayuno de/i }).first();
    await celda.click();
    await expect(celda).toHaveAttribute('aria-checked', 'true');
    await expect(celda).toContainText('Sede');
  });

  // El tag de la fila informa; no restringe. Si el administrador se olvidó de
  // cargar la elegibilidad, el responsable igual tiene que poder entregar, y esa
  // entrega queda registrada como desvío para verla en Insights.
  test('se puede entregar una comida que la ficha no prevé', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto('/viandas?lugar=SEDE');
    // El deportista seedeado con solo cena: su almuerzo queda fuera de ficha.
    const celda = page
      .getByRole('switch', { name: /almuerzo de .*\(fuera de su ficha\)/i })
      .first();
    await expect(celda).toBeEnabled();

    await celda.click();
    await expect(celda).toHaveAttribute('aria-checked', 'true');
    await expect(
      page.getByRole('group', { name: /resumen por comida/i }),
    ).toContainText(/fuera de ficha/i);
  });

  // El caso que justifica el módulo: no se puede retirar dos veces, ni cambiando
  // de puesto.
  test('no se puede retirar la misma comida en dos lugares', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto('/viandas?lugar=SEDE');
    await page.getByRole('switch', { name: /almuerzo de/i }).first().click();

    await page.goto('/viandas?lugar=BOSQUESITO');
    await page.getByRole('switch', { name: /almuerzo de/i }).first().click();
    await expect(page.getByText(/ya retiró/i)).toBeVisible();
  });

  test('el responsable de viandas solo ve Dashboard y Viandas', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto('/viandas');
    await expect(page.getByRole('link', { name: 'Viandas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Deportistas' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Convocatorias' })).toHaveCount(0);
  });

  test('un responsable sin lugar asignado no puede marcar', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto('/viandas');
    await expect(page.getByRole('alert')).toContainText(/no tiene un lugar de retiro/i);
  });

  // El empleado marca desde el teléfono, parado en la puerta del comedor: la
  // vista de cards y el rastro de supervisión tienen que ser usables ahí, y la
  // página no puede desbordar a lo ancho.
  test('mobile — las cards se usan sin scroll horizontal y muestran el rastro', async ({
    page,
  }) => {
    test.skip(true, MOTIVO);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/viandas?lugar=SEDE');

    // En mobile se renderizan las cards, no la tabla.
    await expect(page.getByRole('table')).toHaveCount(0);

    const celda = page.getByRole('switch', { name: /desayuno de/i }).first();
    await celda.click();
    await expect(celda).toHaveAttribute('aria-checked', 'true');
    // El subtexto de supervisión tiene que ser alcanzable sin hover.
    await expect(celda).toContainText('Sede');

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde).toBeLessThanOrEqual(0);
  });
});
