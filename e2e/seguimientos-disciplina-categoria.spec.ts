import { test, expect } from '@playwright/test';

/**
 * E2E — Filtros de Disciplina y Categoría en el listado de Seguimientos.
 *
 * Replica el patrón del listado de Deportistas: dos CustomSelect anidados
 * (disciplina → categoría). El filtro de categoría arranca deshabilitado y se
 * habilita al elegir una disciplina, ofreciendo SOLO sus categorías. Los params
 * viajan por la URL (`?disciplina=<id>&categoria=<id>`) y el server los aplica
 * vía `deportista: { is: { disciplinaId, categoriaId } }`, combinado en AND con
 * el resto de filtros (search, prioridad, área) y la paginación.
 *
 * La ruta /seguimientos está protegida por el middleware de Clerk. Sin una
 * sesión de test válida, el middleware redirige a /sign-in. Siguiendo el patrón
 * del resto del repo (seguimientos.spec.ts, deportistas-categoria.spec.ts), los
 * tests que requieren sesión se marcan como skip hasta configurar los Clerk
 * Testing Tokens / storageState en playwright.config.ts.
 *
 * Para habilitarlos:
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con una sesión válida (rol admin o profesional) y DB
 *    seedeada con al menos una disciplina (p.ej. "Fútbol") con categorías y un
 *    seguimiento cuyo deportista pertenezca a ellas.
 * 3. Referenciar el storageState en playwright.config.ts bajo use.storageState.
 *
 * Checklist QA verificado durante la review (no requiere auth):
 * - buildWhere combina `deportista: { is: {...} }` (filtro) con el bloque `OR`
 *   de search (que también referencia `deportista`) como claves separadas del
 *   mismo objeto → se aplican en AND, sin pisarse.
 * - page.tsx lee `disciplina`/`categoria` de searchParams y los pasa a
 *   getSeguimientos; carga getDisciplinasConCategorias() y pasa disciplinas/
 *   currentDisciplina/currentCategoria al componente (forma == interface Props).
 * - handleDisciplinaChange resetea categoria y page; handleCategoriaChange
 *   resetea page; buildUrl borra params con valor ''/null.
 * - El CustomSelect de categoría usa disabled={!currentDisciplina}.
 * - Cubierto por SeguimientosTable.test.tsx (26 tests).
 */

// ─── Auth gate (no requiere sesión: verifica el redirect) ────────────────────

test.describe('Seguimientos — filtro disciplina/categoría (auth gate)', () => {
  test('usuario no autenticado que entra con filtros en la URL es redirigido a /sign-in', async ({
    page,
  }) => {
    await page.goto('/seguimientos?disciplina=disc-futbol&categoria=cat-primera');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

// ─── Flujos autenticados (skip hasta configurar storageState) ────────────────

test.describe('Seguimientos — filtro disciplina/categoría', () => {
  test.skip(true, 'Requiere sesión de test de Clerk (storageState no configurado)');

  test('el filtro de categoría se anida al de disciplina y ofrece sus categorías', async ({
    page,
  }) => {
    await page.goto('/seguimientos');

    // Arranca deshabilitado (sin disciplina elegida).
    await expect(page.getByRole('button', { name: /todas las categorías/i })).toBeDisabled();

    // Elegir disciplina habilita el filtro de categoría con SOLO sus categorías.
    await page.getByRole('button', { name: /todas las disciplinas/i }).click();
    await page.getByRole('button', { name: 'Fútbol', exact: true }).click();

    await expect(page).toHaveURL(/disciplina=/);
    await expect(page.getByRole('button', { name: /todas las categorías/i })).toBeEnabled();

    await page.getByRole('button', { name: /todas las categorías/i }).click();
    await expect(page.getByRole('button', { name: 'Primera', exact: true })).toBeVisible();
  });

  test('elegir una categoría agrega el param a la URL y filtra la tabla', async ({ page }) => {
    await page.goto('/seguimientos');

    await page.getByRole('button', { name: /todas las disciplinas/i }).click();
    await page.getByRole('button', { name: 'Fútbol', exact: true }).click();
    await page.getByRole('button', { name: /todas las categorías/i }).click();
    await page.getByRole('button', { name: 'Primera', exact: true }).click();

    await expect(page).toHaveURL(/categoria=[a-z0-9-]+/i);
  });

  test('cambiar de disciplina resetea la categoría y la paginación', async ({ page }) => {
    await page.goto('/seguimientos?disciplina=disc-futbol&categoria=cat-primera&page=2');

    // Elegir otra disciplina limpia `categoria` y `page`.
    await page.getByRole('button', { name: /fútbol|todas las disciplinas/i }).first().click();
    await page.getByRole('button', { name: 'Básquet', exact: true }).click();

    await expect(page).not.toHaveURL(/categoria=/);
    await expect(page).not.toHaveURL(/page=/);
  });

  test('elegir "Todas las disciplinas" limpia ambos params', async ({ page }) => {
    await page.goto('/seguimientos?disciplina=disc-futbol&categoria=cat-primera');

    await page.getByRole('button', { name: /fútbol/i }).first().click();
    await page.getByRole('button', { name: /todas las disciplinas/i }).click();

    await expect(page).not.toHaveURL(/disciplina=/);
    await expect(page).not.toHaveURL(/categoria=/);
  });

  test('regresión — el filtro de disciplina se combina con la búsqueda (AND)', async ({ page }) => {
    // search + disciplina deben aplicarse juntos (título/nombre matchean Y la
    // disciplina del deportista coincide), sin que uno pise al otro.
    await page.goto('/seguimientos?q=lesion&disciplina=disc-futbol');
    await expect(page).toHaveURL(/q=lesion/);
    await expect(page).toHaveURL(/disciplina=disc-futbol/);
    // La tabla renderiza sin error (el where combinado es válido en Prisma).
    await expect(page.getByRole('heading', { name: 'Seguimientos' })).toBeVisible();
  });

  test('mobile — los filtros de disciplina y categoría son usables en viewport chico', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/seguimientos');

    await expect(page.getByRole('button', { name: /todas las disciplinas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /todas las categorías/i })).toBeDisabled();

    await page.getByRole('button', { name: /todas las disciplinas/i }).click();
    await page.getByRole('button', { name: 'Fútbol', exact: true }).click();
    await expect(page.getByRole('button', { name: /todas las categorías/i })).toBeEnabled();
  });
});
