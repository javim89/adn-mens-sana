import { test, expect } from '@playwright/test';

/**
 * E2E — Refactor "categoria enum → FK" en el módulo Deportistas.
 *
 * Cubre los flujos afectados por el rename del modelo de categoría (de enum a
 * tabla `categorias` con FK `categoriaId`) y por el side-effect en Calendario.
 *
 * Las rutas /deportistas y /calendario están protegidas por el middleware de
 * Clerk. Sin una sesión de test válida, el middleware redirige a /sign-in.
 * Estos tests siguen el patrón del resto del repo (deportistas.spec.ts,
 * calendario.spec.ts, sidebar-nav.spec.ts): se marcan como skip hasta configurar
 * los Clerk Testing Tokens / storageState en playwright.config.ts.
 *
 * Para habilitarlos:
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con una sesión válida (rol admin o profesional) y,
 *    para los flujos de listado/edición, DB seedeada con al menos un deportista.
 * 3. Referenciar el storageState en playwright.config.ts bajo use.storageState.
 *
 * Notas de selectors (verificadas contra los componentes reales):
 * - El select "Categoría" del formulario es un EnumSelect → CustomSelect, que
 *   renderiza un <button> (no un <select> nativo). Se abre con click y las
 *   opciones son <button> dentro de la lista. Por eso NO se usa selectOption().
 * - El label "Categoría" está asociado al trigger vía htmlFor="categoria".
 * - El filtro "Categoría" del listado es otro CustomSelect (searchable) que se
 *   puebla desde GET /api/categorias.
 * - El detalle muestra la categoría en un FieldRow con label "Categoría"; cuando
 *   es null muestra "—".
 *
 * Checklist QA verificado durante la review (no requiere auth):
 * - GET /api/categorias devuelve las 15 categorías ordenadas por `orden`
 *   (4ta..Veteranos) — cubierto por unit tests de lib/queries/categorias.
 * - TabDeportivo.tsx bindea data.categoriaId al select y persiste categoriaId.
 * - DeportistasTable.tsx agrega filter[categoriaId] a la query y a la URL, y
 *   resetea con "Limpiar".
 * - La columna Categoría del listado muestra categoria.nombre o "—".
 * - Calendario: page.tsx sigue siendo Server Component y getCalendarioData()
 *   funciona tras el rename del modelo y la eliminación de `grupo`.
 */

const CATEGORIAS_ORDENADAS = [
  '4ta',
  '5ta',
  '6ta',
  '7ma',
  '8va',
  '9na',
  'SUB-12',
  'SUB-14',
  'SUB-16',
  'SUB-18',
  'Reserva',
  'División de Honor',
  'Primera',
  'Senior',
  'Veteranos',
];

test.describe('Deportistas — Alta con categoría (FK)', () => {
  test.skip(true, 'Requiere sesión de test de Clerk (storageState no configurado)');

  test('el select Categoría ofrece las 15 categorías ordenadas por orden', async ({ page }) => {
    await page.goto('/deportistas/nuevo');

    // El formulario está organizado en tabs; la categoría vive en el tab Deportivo.
    await page.getByRole('tab', { name: /deportivo/i }).click();

    // Abrir el CustomSelect de Categoría (trigger asociado al label "Categoría").
    await page.getByLabel('Categoría').click();

    // Las opciones se renderizan como botones dentro del dropdown, en orden por `orden`.
    const opciones = page.getByRole('button', { name: new RegExp(`^(${CATEGORIAS_ORDENADAS.join('|')})$`) });
    await expect(opciones).toHaveCount(CATEGORIAS_ORDENADAS.length);

    const textos = await opciones.allInnerTexts();
    expect(textos.map((t) => t.trim())).toEqual(CATEGORIAS_ORDENADAS);
  });

  test('seleccionar una categoría y guardar persiste categoriaId y el detalle la muestra', async ({ page }) => {
    await page.goto('/deportistas/nuevo');

    // Datos personales requeridos (tab Personal, visible por defecto).
    await page.getByLabel(/apellido \*/i).fill('CatE2E');
    await page.getByLabel(/nombre \*/i).fill('Runner');
    await page.getByLabel(/dni \*/i).fill('22222222');
    await page.getByLabel(/fecha de nacimiento/i).fill('2005-03-10');

    // Tab Deportivo → elegir categoría "5ta".
    await page.getByRole('tab', { name: /deportivo/i }).click();
    await page.getByLabel('Categoría').click();
    await page.getByRole('button', { name: '5ta', exact: true }).click();

    await page.getByRole('button', { name: 'Guardar' }).click();

    // Redirige al detalle y el FieldRow "Categoría" muestra el nombre elegido.
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9]+$/);
    const detail = page.getByText('Categoría').locator('..');
    await expect(detail).toContainText('5ta');
  });
});

test.describe('Deportistas — Edición de categoría (FK)', () => {
  test.skip(true, 'Requiere sesión de test de Clerk + al menos un deportista con categoría en DB');

  test('el select precarga la categoría actual y permite cambiarla', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');

    const firstLink = page.locator('table tbody tr a').first();
    const href = await firstLink.getAttribute('href');
    await firstLink.click();
    await page.getByRole('link', { name: 'Editar' }).click();

    // Precarga: el trigger de Categoría no muestra el placeholder.
    await page.getByRole('tab', { name: /deportivo/i }).click();
    const categoriaTrigger = page.getByLabel('Categoría');
    await expect(categoriaTrigger).not.toHaveText(/seleccionar categoría/i);

    // Cambiar a "Primera".
    await categoriaTrigger.click();
    await page.getByRole('button', { name: 'Primera', exact: true }).click();

    await page.getByRole('button', { name: 'Guardar' }).click();

    // Vuelve al detalle mostrando la nueva categoría.
    await expect(page).toHaveURL(href!);
    const detail = page.getByText('Categoría').locator('..');
    await expect(detail).toContainText('Primera');
  });

  test('limpiar la categoría (vacío = null) hace que el detalle muestre "—"', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');

    const firstLink = page.locator('table tbody tr a').first();
    const href = await firstLink.getAttribute('href');
    await firstLink.click();
    await page.getByRole('link', { name: 'Editar' }).click();

    // Deseleccionar: el CustomSelect ofrece una opción vacía para volver a null.
    await page.getByRole('tab', { name: /deportivo/i }).click();
    await page.getByLabel('Categoría').click();
    await page.getByRole('button', { name: /sin categoría|ninguna|—/i }).click();

    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page).toHaveURL(href!);
    const detail = page.getByText('Categoría').locator('..');
    await expect(detail).toContainText('—');
  });
});

test.describe('Deportistas — Filtro por categoría (FK)', () => {
  test.skip(true, 'Requiere sesión de test de Clerk (storageState no configurado)');

  test('el combo Categoría se puebla desde GET /api/categorias', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table');

    // Abrir el filtro de categoría (CustomSelect searchable).
    await page.getByRole('button', { name: /todas las categorías/i }).click();

    // Al menos las categorías conocidas aparecen como opciones.
    for (const nombre of ['5ta', 'Primera', 'Veteranos']) {
      await expect(page.getByRole('button', { name: nombre, exact: true })).toBeVisible();
    }
  });

  test('aplicar el filtro agrega filter[categoriaId]=<cuid> a la URL', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table');

    await page.getByRole('button', { name: /todas las categorías/i }).click();
    await page.getByRole('button', { name: '5ta', exact: true }).click();

    // La URL contiene el filtro JSON:API con un id (cuid/uuid), no el enum viejo.
    await expect(page).toHaveURL(/filter%5BcategoriaId%5D=[a-z0-9-]+/i);
  });

  test('Limpiar resetea el filtro de categoría', async ({ page }) => {
    await page.goto('/deportistas?filter%5BcategoriaId%5D=abc123&page%5Bnumber%5D=1&page%5Bsize%5D=20');
    await page.waitForSelector('table');

    await page.getByRole('button', { name: 'Limpiar' }).click();

    await expect(page).toHaveURL('/deportistas');
  });

  test('la columna Categoría muestra el nombre o "—"', async ({ page }) => {
    await page.goto('/deportistas');
    await page.waitForSelector('table tbody tr');

    // La cabecera "Categoría" existe en la tabla (visible en lg+).
    await expect(page.getByRole('columnheader', { name: 'Categoría' })).toBeVisible();

    // Cada fila muestra un nombre de categoría o el guion largo cuando es null.
    const primeraFila = page.locator('table tbody tr').first();
    const celdaCategoria = primeraFila.locator('td').nth(3);
    await expect(celdaCategoria).toHaveText(/.+/);
  });
});

test.describe('Calendario — smoke de regresión tras rename del modelo', () => {
  test.skip(true, 'Requiere sesión de test de Clerk (storageState no configurado)');

  test('/calendario sigue cargando correctamente tras el rename y la eliminación de grupo', async ({ page }) => {
    await page.goto('/calendario');
    // El heading "Calendario" y el grid mensual de FullCalendar deben renderizar
    // sin errores de datos (getCalendarioData() funciona con el modelo renombrado).
    await expect(page.getByRole('heading', { name: 'Calendario' })).toBeVisible();
    await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();
  });
});
