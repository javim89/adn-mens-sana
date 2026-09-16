import { test, expect } from '@playwright/test';

/**
 * E2E de los flujos del módulo Insights (crear dashboard → agregar widget →
 * reordenar → guardar → exportar).
 *
 * Todos SKIPEADOS, igual que el resto de los specs autenticados del repo: el
 * proyecto nunca configuró `@clerk/testing` ni un `storageState`, así que el
 * middleware redirige a /sign-in y estos tests fallarían por auth, no por la
 * funcionalidad.
 *
 * Para habilitarlos:
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con sesión de un usuario `role = admin`
 *    (PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD).
 * 3. Referenciarlo en playwright.config.ts bajo `use.storageState`.
 * 4. Correr `npm run seed:insights` para tener el dashboard "Panorama general".
 *
 * Mientras tanto, lo que SÍ está cubierto y corriendo:
 * - `e2e/insights-access.spec.ts` — el módulo entero exige sesión.
 * - `lib/insights/__tests__/` — compilador, guard de SQL, catálogo (279 tests).
 * - `lib/actions/__tests__/insights.test.ts` — guard de admin en cada action.
 * - `app/api/insights/query/__tests__/route.test.ts` — 401/403/400/500 del handler.
 * - los `__tests__` bajo `app/(app)/insights/` — charts, grilla, undo/redo, export.
 */
test.describe('Insights — flujos de admin', () => {
  test.skip(
    true,
    'Requiere sesión de Clerk con rol admin (storageState sin configurar)',
  );

  test('el dashboard por defecto muestra sus widgets con datos reales', async ({ page }) => {
    await page.goto('/insights');

    await page.getByRole('link', { name: /Panorama general/ }).click();
    await page.waitForURL('**/insights/**');

    await expect(page.getByRole('heading', { name: 'Panorama general' })).toBeVisible();
    await expect(page.getByText('Deportistas activos')).toBeVisible();
    await expect(page.getByText('Deportistas por disciplina')).toBeVisible();

    // El KPI tiene que mostrar un número, no el empty state.
    await expect(page.getByText('Sin datos para mostrar')).toHaveCount(0);
  });

  test('crear un dashboard y agregarle un widget desde el constructor visual', async ({
    page,
  }) => {
    await page.goto('/insights');

    await page.getByRole('button', { name: 'Nuevo dashboard' }).click();
    await page.getByLabel('Nombre').fill('Tablero E2E');
    await page.getByRole('button', { name: 'Crear' }).click();

    // Se entra directo al editor.
    await page.waitForURL('**/editar');
    await expect(page.getByText('Dashboard vacío')).toBeVisible();

    await page.getByRole('button', { name: 'Agregar widget' }).click();
    await expect(page.getByText('Crear widget')).toBeVisible();

    await page.getByLabel('Título').fill('Deportistas por estado');
    await page.getByLabel('Tipo de visualización').selectOption('bar');
    await page.getByLabel('Estado', { exact: true }).check();

    // El preview ejecuta la query real contra la API.
    await expect(page.getByText('Vista previa')).toBeVisible();
    await expect(page.getByText(/\d+ filas?/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Agregar widget' }).last().click();
    await expect(page.getByText('Deportistas por estado')).toBeVisible();

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Dashboard guardado')).toBeVisible();

    // Al recargar, el widget persiste.
    await page.reload();
    await expect(page.getByText('Deportistas por estado')).toBeVisible();
  });

  test('el layout se persiste después de mover un widget', async ({ page }) => {
    await page.goto('/insights');
    await page.getByRole('link').first().click();
    await page.getByRole('link', { name: 'Editar' }).click();
    await page.waitForURL('**/editar');

    const handle = page.locator('.widget-drag-handle').first();
    const box = await handle.boundingBox();
    if (!box) throw new Error('No se encontró el asa de arrastre');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 200, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Dashboard guardado')).toBeVisible();
  });

  test('deshacer y rehacer funcionan en el editor', async ({ page }) => {
    await page.goto('/insights');
    await page.getByRole('link').first().click();
    await page.getByRole('link', { name: 'Editar' }).click();

    const undo = page.getByRole('button', { name: 'Deshacer' });
    await expect(undo).toBeDisabled();

    // Eliminar un widget habilita deshacer, y deshacer lo trae de vuelta.
    const titulo = await page.locator('.widget-drag-handle h3').first().textContent();
    await page.getByLabel(/Acciones de/).first().click();
    await page.getByText('Eliminar').click();
    await expect(page.getByText(titulo!)).toHaveCount(0);

    await undo.click();
    await expect(page.getByText(titulo!)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rehacer' })).toBeEnabled();
  });

  test('el editor SQL rechaza una consulta que no es de lectura', async ({ page }) => {
    await page.goto('/insights');
    await page.getByRole('link').first().click();
    await page.getByRole('link', { name: 'Editar' }).click();
    await page.getByRole('button', { name: 'Agregar widget' }).click();

    await page.getByRole('button', { name: 'SQL' }).click();
    await page.getByLabel('Consulta SQL').fill('DELETE FROM deportistas');

    await expect(page.getByText(/no permitida|SELECT o WITH/)).toBeVisible();
  });

  test('exportar CSV descarga un archivo', async ({ page }) => {
    await page.goto('/insights');
    await page.getByRole('link').first().click();

    const descarga = page.waitForEvent('download');
    await page.getByLabel(/Acciones de/).first().click();
    await page.getByText('Exportar CSV').click();

    expect((await descarga).suggestedFilename()).toMatch(/\.csv$/);
  });

  test('un dashboard del sistema no se puede eliminar', async ({ page }) => {
    await page.goto('/insights');
    await expect(page.getByText('Sistema')).toBeVisible();
  });
});

/** Un rol no-admin no debe poder entrar ni ver el item en el menú. */
test.describe('Insights — acceso de un rol no admin', () => {
  test.skip(true, 'Requiere sesión de Clerk con rol entrenador');

  test('redirige a /dashboard y no aparece en el sidebar', async ({ page }) => {
    await page.goto('/insights');
    await page.waitForURL('**/dashboard');

    await expect(page.getByRole('link', { name: 'Insights' })).toHaveCount(0);
  });
});
