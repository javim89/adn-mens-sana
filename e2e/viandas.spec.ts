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
 * 5. Exportar sus ids en E2E_VIANDAS_DISCIPLINA_ID / E2E_VIANDAS_CATEGORIA_ID:
 *    la página no lista nada sin disciplina y categoría en la URL.
 * 6. Para la regla de merienda: una categoría que solo recibe desayuno (Reserva o
 *    4ta–9na) con al menos un deportista y sin meriendas registradas hoy, en
 *    E2E_VIANDAS_CATEGORIA_SIN_MERIENDA_ID (misma disciplina).
 */
const MOTIVO = 'Requiere sesión de Clerk con rol admin (storageState sin configurar)';

const PLANTEL_SEEDEADO = new URLSearchParams({
  disciplina: process.env.E2E_VIANDAS_DISCIPLINA_ID ?? '',
  categoria: process.env.E2E_VIANDAS_CATEGORIA_ID ?? '',
}).toString();

test.describe('Viandas — registro del día', () => {
  test('el admin ve todo el plantel con su tag de elegibilidad', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto('/viandas?lugar=SEDE');
    // Todos los deportistas de la categoría, reciban vianda o no.
    await expect(page.getByText('No recibe vianda').first()).toBeVisible();
    await expect(page.getByRole('group', { name: /resumen por comida/i })).toBeVisible();
  });

  // "Cena" incluye a los que reciben las dos: solo quedan afuera los que la ficha
  // no le prevé cena.
  test('el filtro de comida deja solo a quienes reciben cena', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto(`/viandas?lugar=SEDE&comida=CENA&${PLANTEL_SEEDEADO}`);
    await expect(page.getByText('Recibe solo cena').first()).toBeVisible();
    await expect(page.getByText('Recibe solo almuerzo')).toHaveCount(0);
    await expect(page.getByText('No recibe vianda')).toHaveCount(0);
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

  // Reserva y 4ta–9na reciben solo desayuno: la merienda se puede registrar igual
  // (no se bloquea), pero queda como desvío en el resumen.
  test('una merienda a una categoría que solo recibe desayuno cuenta como fuera de ficha', async ({
    page,
  }) => {
    test.skip(true, MOTIVO);

    const params = new URLSearchParams({
      lugar: 'SEDE',
      disciplina: process.env.E2E_VIANDAS_DISCIPLINA_ID ?? '',
      categoria: process.env.E2E_VIANDAS_CATEGORIA_SIN_MERIENDA_ID ?? '',
    });
    await page.goto(`/viandas?${params}`);

    const resumen = page.getByRole('group', { name: /resumen por comida/i });
    const chipMerienda = resumen.locator('div', { hasText: /^Merienda/ });
    await expect(chipMerienda).toContainText('/ 0 esperadas');

    const celda = page
      .getByRole('switch', { name: /merienda de .*\(fuera de su ficha\)/i })
      .first();
    await expect(celda).toBeEnabled();
    await celda.click();
    await expect(celda).toHaveAttribute('aria-checked', 'true');
    await expect(chipMerienda).toContainText(/1 fuera de ficha/i);
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

  // El histórico existe para consultar, no para corregir: la fecha de escritura
  // siempre la pone el servidor, así que un día pasado tiene que quedar cerrado
  // entero — no celda por celda.
  test('el admin consulta un día pasado en solo lectura', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto('/viandas?lugar=SEDE&fecha=2026-03-13');

    await expect(page.getByRole('status')).toContainText(/histórico del 13\/03\/2026/i);
    const celda = page.getByRole('switch', { name: /desayuno de/i }).first();
    await expect(celda).toBeDisabled();

    // "Hoy" saca el param en vez de fijarlo, para no congelar el día en un link.
    await page.getByRole('button', { name: 'Hoy' }).click();
    await expect(page).toHaveURL(/^(?!.*fecha=).*\/viandas/);
    await expect(page.getByRole('switch', { name: /desayuno de/i }).first()).toBeEnabled();
  });

  // El gate del histórico es server-side: armar la URL a mano no alcanza.
  test('un responsable_viandas con ?fecha= igual ve el día de hoy', async ({ page }) => {
    test.skip(true, MOTIVO);

    await page.goto('/viandas?fecha=2026-03-13');

    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByLabel('Fecha')).toHaveCount(0);
    await expect(page.getByRole('switch', { name: /desayuno de/i }).first()).toBeEnabled();
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
