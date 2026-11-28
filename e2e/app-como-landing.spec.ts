import { test, expect } from '@playwright/test';

/**
 * E2E de la nueva UI de los módulos (feature app-como-landing): encabezado con
 * contador (`EncabezadoPagina`), filtros en chips (`FiltroChip`, popover con
 * role=option) y columna derecha (`LayoutConLateral`, un `<aside>` con nombre).
 *
 * Requieren una sesión de Clerk. Sin un usuario de test el middleware redirige a
 * /sign-in, así que quedan salteados (mismo patrón que `seguimientos.spec.ts` y
 * `deportistas.spec.ts`).
 *
 * Para habilitarlos:
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con la sesión de un admin del club
 * 3. Referenciarlo en playwright.config.ts (`use.storageState`)
 * Después, quitar la línea `test.skip(true, …)` de cada describe.
 */

const MOBILE = { width: 375, height: 812 };

test.describe('Seguimientos — nueva UI', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('happy path — encabezado con contador, filtros en chips y columna derecha', async ({ page }) => {
    await page.goto('/seguimientos');
    await expect(page.getByRole('heading', { level: 1, name: 'Seguimientos' })).toBeVisible();

    const lateral = page.getByRole('complementary', { name: 'Resumen de seguimientos' });
    await expect(lateral).toBeVisible();
    await expect(lateral.getByRole('heading', { name: 'Seguimientos por tipo' })).toBeVisible();

    // Tipo: chip simple → ?tipo=<enum> y el chip muestra el valor elegido.
    await page.getByRole('button', { name: 'Tipo', exact: true }).click();
    await page.getByRole('option', { name: 'Antropometría', exact: true }).click();
    await expect(page).toHaveURL(/[?&]tipo=ANTROPOMETRIA/);
    await expect(page.getByRole('button', { name: 'Tipo: Antropometría' })).toBeVisible();
  });

  test('prioridad múltiple — dos prioridades quedan en la URL', async ({ page }) => {
    await page.goto('/seguimientos');
    await page.getByRole('button', { name: 'Prioridad', exact: true }).click();
    await page.getByRole('option', { name: 'Urgente', exact: true }).click();
    await page.getByRole('option', { name: 'Alta', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Prioridad: 2' })).toBeVisible();
    await expect(page).toHaveURL(/prioridad=URGENTE(%2C|,)ALTA/);
  });

  test('regresión — el link del dashboard con una sola prioridad sigue filtrando', async ({ page }) => {
    await page.goto('/seguimientos?prioridad=URGENTE');
    await expect(page.getByRole('button', { name: 'Prioridad: Urgente' })).toBeVisible();
  });

  test('empty state — una búsqueda sin resultados no rompe la página', async ({ page }) => {
    await page.goto('/seguimientos?q=zzzz-sin-resultados-zzzz');
    await expect(page.getByRole('heading', { level: 1, name: 'Seguimientos' })).toBeVisible();
    await expect(page.getByText(/no hay seguimientos/i).first()).toBeVisible();
  });

  test('mobile — la columna derecha baja debajo del listado', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/seguimientos');
    await expect(page.getByRole('heading', { level: 1, name: 'Seguimientos' })).toBeVisible();
    const lateral = page.getByRole('complementary', { name: 'Resumen de seguimientos' });
    await expect(lateral).toBeVisible();
    const sinScrollHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(sinScrollHorizontal).toBe(true);
  });
});

test.describe('Deportistas — nueva UI', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('happy path — encabezado, chips de filtro y resumen del plantel', async ({ page }) => {
    await page.goto('/deportistas');
    await expect(page.getByRole('heading', { level: 1, name: 'Deportistas' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Resumen del plantel' })).toBeVisible();

    await page.getByRole('button', { name: 'Estado', exact: true }).click();
    await page.getByRole('option', { name: 'Activo', exact: true }).click();
    await expect(page).toHaveURL(/filter%5Bestado%5D=ACTIVO/);
    await expect(page.getByRole('button', { name: 'Estado: Activo' })).toBeVisible();

    // Limpiar vuelve a /deportistas sin filtros.
    await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
    await expect(page).toHaveURL('/deportistas');
  });

  test('empty state — búsqueda sin resultados ofrece "Limpiar filtros"', async ({ page }) => {
    await page.goto('/deportistas?filter%5Bsearch%5D=zzzz-sin-resultados-zzzz');
    await expect(page.getByText('No se encontraron deportistas').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Limpiar filtros' }).first()).toBeVisible();
  });

  test('mobile — la tabla pasa a tarjetas y no hay scroll horizontal', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/deportistas');
    await expect(page.getByRole('heading', { level: 1, name: 'Deportistas' })).toBeVisible();
    // La tabla solo se muestra en lg+; en mobile se ve la lista de tarjetas.
    await expect(page.getByRole('table')).toBeHidden();
    const sinScrollHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(sinScrollHorizontal).toBe(true);
  });
});

test.describe('Convocatorias — nueva UI', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('happy path — encabezado con contador y filtro anidado disciplina → categoría', async ({ page }) => {
    await page.goto('/convocatorias');
    await expect(page.getByRole('heading', { level: 1, name: 'Convocatorias' })).toBeVisible();

    const categoria = page.getByRole('button', { name: 'Categoría', exact: true });
    await expect(categoria).toBeDisabled();

    await page.getByRole('button', { name: 'Disciplina', exact: true }).click();
    await page.getByRole('option', { name: 'Fútbol', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Disciplina: Fútbol' })).toBeVisible();
    await expect(categoria).toBeEnabled();
  });

  test('detalle — resumen en la columna derecha y lista de citados', async ({ page }) => {
    await page.goto('/convocatorias');
    // Requiere al menos una convocatoria en la DB.
    await page.getByRole('link', { name: /ver|vs\.?|convocatoria/i }).first().click();
    await expect(page).toHaveURL(/\/convocatorias\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const lateral = page.getByRole('complementary', { name: 'Resumen de la convocatoria' });
    await expect(lateral).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Citados \(\d+\)$/ })).toBeVisible();
  });

  test('mobile — sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/convocatorias');
    await expect(page.getByRole('heading', { level: 1, name: 'Convocatorias' })).toBeVisible();
    const sinScrollHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(sinScrollHorizontal).toBe(true);
  });
});

test.describe('Turnos — nueva UI', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('happy path — navegar semanas y ver próximos turnos a la derecha', async ({ page }) => {
    await page.goto('/turnos');
    await expect(page.getByRole('heading', { level: 1, name: 'Turnos' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Próximos turnos' })).toBeVisible();

    const semana = page.getByRole('group', { name: 'Semana' });
    const rangoInicial = await semana.innerText();
    await semana.getByRole('button', { name: 'Semana siguiente' }).click();
    await expect(semana).not.toHaveText(rangoInicial);
  });

  test('admin — vista "Por profesional"', async ({ page }) => {
    await page.goto('/turnos');
    const vista = page.getByRole('group', { name: 'Vista' });
    await vista.getByRole('button', { name: 'Por profesional' }).click();
    await expect(page).toHaveURL(/[?&]vista=profesional/);
    await expect(vista.getByRole('button', { name: 'Por profesional' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('list', { name: 'Turnos por profesional' })).toBeVisible();
  });

  test('no-admin — ?vista=profesional se ignora y no hay selector de vista', async ({ page }) => {
    // Requiere storageState de un rol no-admin (medico, kinesiologo, …).
    await page.goto('/turnos?vista=profesional');
    await expect(page.getByRole('group', { name: 'Vista' })).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Turnos por profesional' })).toHaveCount(0);
  });

  test('mobile — sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/turnos');
    await expect(page.getByRole('heading', { level: 1, name: 'Turnos' })).toBeVisible();
    const sinScrollHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(sinScrollHorizontal).toBe(true);
  });
});

test.describe('Presentismo — nueva UI', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('happy path — encabezado de la semana, estadísticas y filtros', async ({ page }) => {
    await page.goto('/presentismo');
    await expect(page.getByRole('heading', { level: 1, name: 'Presentismo' })).toBeVisible();
    await expect(page.getByText(/^Semana /)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Entrenamientos' })).toBeVisible();

    const filtros = page.getByRole('group', { name: 'Filtros' });
    await filtros.getByRole('button', { name: 'Disciplina', exact: true }).click();
    await page.getByRole('option', { name: 'Fútbol', exact: true }).click();
    await expect(page).toHaveURL(/[?&]disciplina=/);
    await expect(filtros.getByRole('button', { name: 'Categoría', exact: true })).toBeEnabled();
  });

  test('empty state — semana sin registros por categoría', async ({ page }) => {
    // Una disciplina inexistente filtra todo: la semana queda sin registros.
    await page.goto('/presentismo?disciplina=sin-datos');
    await expect(page.getByRole('heading', { level: 1, name: 'Presentismo' })).toBeVisible();
    await expect(page.getByText('Sin registros por categoría esta semana')).toBeVisible();
  });

  test('mobile — sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/presentismo');
    await expect(page.getByRole('heading', { level: 1, name: 'Presentismo' })).toBeVisible();
    const sinScrollHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(sinScrollHorizontal).toBe(true);
  });
});

/**
 * Sin sesión, las rutas de los módulos redirigen a /sign-in. Requiere un dev
 * server con claves de Clerk (mismo patrón que `convocatorias.spec.ts`).
 */
test.describe('Módulos — auth gate', () => {
  test.skip(!process.env.CLERK_SECRET_KEY, 'Requires a dev server configured with Clerk keys');

  for (const ruta of ['/seguimientos', '/deportistas', '/convocatorias', '/turnos', '/presentismo']) {
    test(`acceso no autenticado a ${ruta} redirige a /sign-in`, async ({ page }) => {
      await page.context().clearCookies();
      await page.goto(ruta);
      await page.waitForURL('**/sign-in**');
      expect(new URL(page.url()).pathname).toBe('/sign-in');
    });
  }
});
