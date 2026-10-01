import { test, expect, type Page } from '@playwright/test';

/**
 * Dashboard — happy path AUTENTICADO. SKIPPEADO.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTÁ SKIPPEADO Y CÓMO HABILITARLO
 * ---------------------------------------------------------------------------
 * El proyecto no tiene `storageState` ni `@clerk/testing` configurado, así que hoy
 * ningún spec puede autenticarse (son ~80 tests skippeados por el mismo motivo; es una
 * tarea `infra` pendiente del proyecto entero, no de esta feature). El control de
 * acceso sin sesión sí corre de verdad: ver `e2e/dashboard-access.spec.ts`.
 *
 * Para habilitarlo:
 *   1. `npm i -D @clerk/testing`
 *   2. Setear `CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` en el entorno de test
 *   3. Agregar un `globalSetup` con `clerkSetup()` y guardar el `storageState` de un
 *      usuario con `publicMetadata.role = 'admin'`
 *   4. Borrar el `test.skip` de abajo
 *
 * Datos que necesita: `npm run seed:all` (deportistas, turnos, seguimientos y
 * calendario). El triage se puebla llamando al cron una vez:
 *   curl -X POST localhost:3000/api/cron/triage -H "Authorization: Bearer $CRON_SECRET"
 * Viandas y presentismo quedan vacíos por decisión del usuario (sin seeds nuevos), así
 * que sus cards se verifican en su estado vacío; los casos que necesitan datos se
 * skippean solos cuando el bloque no los tiene.
 *
 * ---------------------------------------------------------------------------
 * SELECTORES (rediseño visual)
 * ---------------------------------------------------------------------------
 * - Cada módulo es un `<section aria-labelledby>`: `getByRole('region', { name })`.
 * - Las mini-cards linkeadas llevan el conteo en el aria-label:
 *   "Ver deportistas activos en nivel Rojo (12)", "Ver los seguimientos con prioridad
 *   Alta (3)", "Ver los deportistas con estado Lesionado (4)". Se matchean con regex
 *   anclada y el número se extrae de ahí: es el mismo número que muestra la card.
 * - La card "Seguimientos de prioridad alta" ya no existe: ALTA vive en su mini-card.
 */
test.skip(
  true,
  'Requiere sesión de Clerk con rol admin (storageState sin configurar en el proyecto)',
);

/** El número entre paréntesis al final de un aria-label con conteo. */
async function conteoDelLabel(page: Page, nombre: RegExp): Promise<number> {
  const label = await page.getByRole('link', { name: nombre }).getAttribute('aria-label');
  const match = label?.match(/\((\d+)\)$/);
  expect(match, `el aria-label "${label}" tendría que terminar en "(N)"`).not.toBeNull();
  return Number(match![1]);
}

const BLOQUES_ADMIN = [
  'Triage',
  'Viandas',
  'Turnos',
  'Presentismo',
  'Seguimientos',
  'Plantel',
  'Calendario',
];

test.describe('Dashboard — admin', () => {
  test('muestra los 7 bloques y ningún placeholder del mock', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    for (const bloque of BLOQUES_ADMIN) {
      await expect(page.getByRole('region', { name: bloque })).toBeVisible();
      await expect(page.getByRole('heading', { name: bloque, level: 2 })).toBeVisible();
    }
    await expect(page.getByText('Deportistas activos en rojo')).toBeVisible();
    await expect(page.getByText('Distribución de triage')).toBeVisible();
    await expect(page.getByText('Backlog por prioridad')).toBeVisible();

    // La card de ALTA se reemplazó por la mini-card del backlog.
    await expect(page.getByText('Seguimientos de prioridad alta')).toHaveCount(0);

    for (const mock of [
      'Matías González inscripto en Fútbol',
      'Turno cancelado — Natación 10:00hs',
      'Nuevo usuario: Laura Méndez',
      'Actividad reciente',
    ]) {
      await expect(page.getByText(mock)).toHaveCount(0);
    }
  });

  test('el subtítulo dice el rango de la semana en curso', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText(/Resumen de la semana del \d+ al \d+ de \w+/)).toBeVisible();
  });

  /**
   * LA PROPIEDAD QUE PIDIÓ EL USUARIO: el click en "Ver deportistas" del hero de rojo
   * tiene que aterrizar en el listado con el filtro ROJO **y** el de estado ACTIVO
   * aplicados, y el número del hero tiene que ser el mismo que el de la mini-card
   * "Rojo" y el total del listado. Si no coinciden, la card miente.
   */
  test('"Ver deportistas" aterriza con el filtro ROJO + ACTIVO aplicado', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    const triage = page.getByRole('region', { name: 'Triage' });
    // El número gigante es el primer `tabular-nums` del hero (la variación no lo lleva).
    const hero = triage
      .getByText('Deportistas activos en rojo')
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    const numero = Number((await hero.locator('p.tabular-nums').first().textContent())?.trim());

    // El hero y la mini-card "Rojo" muestran el mismo número.
    expect(await conteoDelLabel(page, /^Ver deportistas activos en nivel Rojo \(\d+\)$/)).toBe(
      numero,
    );

    await page
      .getByRole('link', { name: 'Ver los deportistas activos en nivel Rojo', exact: true })
      .click();

    await page.waitForURL('**/deportistas**');
    const url = new URL(page.url());
    expect(url.searchParams.get('filter[nivelTriage]')).toBe('ROJO');
    expect(url.searchParams.get('filter[estado]')).toBe('ACTIVO');

    // El total del listado tiene que ser el mismo número que mostraba la card.
    await expect(page.getByText(new RegExp(`\\b${numero}\\b`)).first()).toBeVisible();
  });

  test('cada mini-card de triage linkea a su nivel', async ({ page }) => {
    await page.goto('/dashboard');

    await page
      .getByRole('link', { name: /^Ver deportistas activos en nivel Naranja \(\d+\)$/ })
      .click();
    await page.waitForURL('**/deportistas**');

    const url = new URL(page.url());
    expect(url.searchParams.get('filter[nivelTriage]')).toBe('NARANJA');
    expect(url.searchParams.get('filter[estado]')).toBe('ACTIVO');
  });

  test('el bucket "sin calcular" linkea al filtro SIN_CALCULAR', async ({ page }) => {
    await page.goto('/dashboard');

    await page
      .getByRole('link', { name: /^Ver deportistas activos en nivel Sin calcular \(\d+\)$/ })
      .click();
    await page.waitForURL('**/deportistas**');

    expect(new URL(page.url()).searchParams.get('filter[nivelTriage]')).toBe('SIN_CALCULAR');
  });

  test('las mini-cards de plantel linkean a su filtro de estado', async ({ page }) => {
    await page.goto('/dashboard');

    const plantel = page.getByRole('region', { name: 'Plantel' });
    // Las 4 mini-cards existen aunque estén en 0, y suman el total del plantel.
    const estados = ['Activo', 'Lesionado', 'Suspendido', 'Inactivo'];
    let suma = 0;
    for (const estado of estados) {
      suma += await conteoDelLabel(
        page,
        new RegExp(`^Ver los deportistas con estado ${estado} \\(\\d+\\)$`),
      );
    }
    const total = Number(
      (await plantel.locator('p.tabular-nums').first().textContent())?.trim(),
    );
    expect(suma).toBe(total);

    await page
      .getByRole('link', { name: /^Ver los deportistas con estado Lesionado \(\d+\)$/ })
      .click();
    await page.waitForURL('**/deportistas**');

    const url = new URL(page.url());
    expect(url.searchParams.get('filter[estado]')).toBe('LESIONADO');
    // El link de plantel NO filtra por triage: cuenta todos los del estado.
    expect(url.searchParams.get('filter[nivelTriage]')).toBeNull();
  });

  test('las mini-cards del backlog linkean a su prioridad', async ({ page }) => {
    await page.goto('/dashboard');

    // La de ALTA reemplaza a la vieja card "Seguimientos de prioridad alta".
    await page
      .getByRole('link', { name: /^Ver los seguimientos con prioridad Alta \(\d+\)$/ })
      .click();
    await page.waitForURL('**/seguimientos**');

    expect(new URL(page.url()).searchParams.get('prioridad')).toBe('ALTA');
  });

  test('"Ver urgentes" y la mini-card Urgente muestran el mismo número', async ({ page }) => {
    await page.goto('/dashboard');

    const seguimientos = page.getByRole('region', { name: 'Seguimientos' });
    const kpi = seguimientos
      .getByText('Seguimientos urgentes')
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    const numero = Number((await kpi.locator('p.tabular-nums').first().textContent())?.trim());

    // Si no hay backlog no hay mini-cards: solo el estado vacío.
    if ((await page.getByText('No hay seguimientos abiertos').count()) === 0) {
      expect(
        await conteoDelLabel(page, /^Ver los seguimientos con prioridad Urgente \(\d+\)$/),
      ).toBe(numero);
    }

    // El badge URGENTE solo aparece con valor > 0.
    await expect(kpi.getByText('URGENTE', { exact: true })).toHaveCount(numero > 0 ? 1 : 0);

    await page
      .getByRole('link', { name: 'Ver los seguimientos con prioridad Urgente', exact: true })
      .click();
    await page.waitForURL('**/seguimientos**');
    expect(new URL(page.url()).searchParams.get('prioridad')).toBe('URGENTE');
  });

  test('cada "Próxima cita" linkea a /seguimientos/[id]', async ({ page }) => {
    await page.goto('/dashboard');

    const citas = page
      .getByRole('region', { name: 'Seguimientos' })
      .getByRole('link', { name: /^Ver el seguimiento .+, cita del \d{2}\/\d{2}\/\d{4}/ });
    test.skip((await citas.count()) === 0, 'No hay citas próximas ni vencidas en la base');

    const href = await citas.first().getAttribute('href');
    expect(href).toMatch(/^\/seguimientos\/[^/?#]+$/);

    await citas.first().click();
    await page.waitForURL(`**${href}`);
    expect(new URL(page.url()).pathname).toBe(href);
  });

  test('"Próximos turnos" muestra a lo sumo 4 tiles', async ({ page }) => {
    await page.goto('/dashboard');

    const turnos = page.getByRole('region', { name: 'Turnos' });
    await expect(turnos.getByText('Turnos de esta semana')).toBeVisible();
    expect(await turnos.locator('ul > li').count()).toBeLessThanOrEqual(4);
  });

  test('presentismo: siempre 7 días y "—" en los días sin registros', async ({ page }) => {
    await page.goto('/dashboard');

    const presentismo = page.getByRole('region', { name: 'Presentismo' });
    const dias = presentismo.getByRole('img', { name: /^Lun: / });
    test.skip((await dias.count()) === 0, 'No hay asistencias registradas esta semana');

    const label = (await dias.getAttribute('aria-label')) ?? '';
    const partes = label.split(', ');
    expect(partes.map((p) => p.split(':')[0])).toEqual([
      'Lun',
      'Mar',
      'Mié',
      'Jue',
      'Vie',
      'Sáb',
      'Dom',
    ]);
    for (const p of partes) expect(p).toMatch(/: (\d{1,3}%|sin dato)$/);
  });

  test('el badge REVISAR de viandas solo aparece con entregas fuera de ficha', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    const card = page
      .getByRole('region', { name: 'Viandas' })
      .getByText('Entregas fuera de ficha')
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    const numero = Number((await card.locator('p.tabular-nums').first().textContent())?.trim());

    await expect(card.getByText('REVISAR', { exact: true })).toHaveCount(numero > 0 ? 1 : 0);
  });

  test('los links con aria-label tienen nombres únicos', async ({ page }) => {
    await page.goto('/dashboard');

    const labels = await page
      .locator('main a[aria-label]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    expect(new Set(labels).size).toBe(labels.length);
  });

  /**
   * Con la base sin seed de viandas y de presentismo, los estados vacíos son el camino
   * por defecto. Lo que se verifica es que **digan algo útil** y que no haya `NaN`,
   * `undefined` ni un `0%` mentiroso en ninguna parte de la página.
   */
  test('los estados vacíos son legibles y no hay NaN ni undefined', async ({ page }) => {
    await page.goto('/dashboard');

    const texto = (await page.locator('main').textContent()) ?? '';
    expect(texto).not.toContain('NaN');
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('Infinity');

    const html = await page.locator('main').innerHTML();
    expect(html).not.toContain('width: NaN');
    expect(html).not.toContain('height: NaN');
  });

  test('sin snapshot previo la card de rojo dice "sin comparación previa", no 0%', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Con el cron corrido una sola vez, el baseline no existe todavía.
    await expect(page.getByText('sin comparación previa').first()).toBeVisible();
  });
});

test.describe('Dashboard — gating por rol', () => {
  /**
   * Requiere un `storageState` por rol. La verificación equivalente que SÍ corre hoy
   * es `app/(app)/dashboard/__tests__/page.test.tsx`, que además prueba lo que un E2E
   * no puede ver: que la query de la card oculta **no se ejecutó**.
   */
  test('un entrenador no ve las cards de viandas ni de turnos', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Presentismo de esta semana')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Viandas' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Turnos' })).toHaveCount(0);
  });

  test('un responsable de viandas solo ve las cards de viandas', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Viandas entregadas esta semana')).toBeVisible();
    await expect(page.getByText('Deportistas activos en rojo')).toHaveCount(0);
    await expect(page.getByText('Distribución de triage')).toHaveCount(0);
    await expect(page.getByText('Backlog por prioridad')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Plantel' })).toHaveCount(0);
  });

  test('un rol inventado ve el estado vacío de "sin rol asignado"', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText(/todavía no tiene un rol asignado/)).toBeVisible();
  });
});

test.describe('Dashboard — responsive', () => {
  /**
   * El proyecto YA TUVO este bug, en la cadena flex del shell (faltaba `min-w-0`), así
   * que se mide y no se mira: `scrollWidth - clientWidth` es la única forma de
   * detectarlo sin ojo humano. Con el rediseño hay más superficies que pueden empujar
   * (tiles de fecha con `min-w-*`, barras apiladas, grillas de mini-cards), así que se
   * mide también cada bloque por separado para saber cuál rompe.
   */
  for (const ancho of [375, 1024]) {
    test(`a ${ancho}px no hay scroll horizontal en todo el dashboard`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 812 });
      await page.goto('/dashboard');
      await expect(page.getByRole('region', { name: 'Triage' })).toBeVisible();
      // Que resuelvan todos los Suspense antes de medir.
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);

      const desbordados = await page.locator('main section').evaluateAll((secciones) =>
        secciones
          .filter((s) => s.scrollWidth > s.clientWidth)
          .map((s) => s.getAttribute('aria-labelledby')),
      );
      expect(desbordados).toEqual([]);
    });
  }

  test('a 375px las grillas se apilan en una sola columna', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');

    const triage = page.getByRole('region', { name: 'Triage' });
    const hero = triage.getByText('Deportistas activos en rojo');
    const distribucion = triage.getByText('Distribución de triage');
    await expect(hero).toBeVisible();
    await expect(distribucion).toBeVisible();

    // Apiladas: la distribución queda DEBAJO del hero, no al costado.
    const a = await hero.boundingBox();
    const b = await distribucion.boundingBox();
    expect(b!.y).toBeGreaterThan(a!.y);
  });

  /**
   * Regresión del scroll trabado: si alguna card se pasa del alto de su sección,
   * `<main>` (que tiene `overflow-y-auto`) queda como scroller anidado con unos pocos
   * px de sobra y la rueda se traba ahí antes de scrollear la página. A 1440px las
   * grillas de plantel y calendario van en dos columnas, que es donde pasaba.
   */
  test('a 1440px <main> no desborda: el único scroller es el documento', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await expect(page.getByRole('region', { name: 'Calendario' })).toBeVisible();

    const sobrante = await page
      .locator('main')
      .evaluate((main) => main.scrollHeight - main.clientHeight);
    expect(sobrante).toBeLessThanOrEqual(1);
  });
});

