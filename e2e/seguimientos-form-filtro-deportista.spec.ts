import { test, expect } from '@playwright/test';

/**
 * E2E — Filtros de Disciplina y Categoría en el FORMULARIO de seguimiento.
 *
 * Antes de elegir deportistas, el formulario de creación/edición ahora ofrece
 * dos selects opcionales — Disciplina y Categoría — que acotan progresivamente
 * las opciones del multi-select de deportistas:
 *   - Sin filtros → el dropdown trae todas las opciones (como antes).
 *   - Con disciplina → `filter[disciplina]` sobre /api/deportistas.
 *   - Con disciplina + categoría → doble filtro (AND).
 * Los filtros son SOLO de UI: no se persisten en el seguimiento. La cascada
 * replica el patrón de DeportistasTable/ConvocatoriaForm (elegir disciplina
 * resetea categoría; categoría arranca deshabilitada).
 *
 * La ruta /seguimientos está protegida por el middleware de Clerk. Sin una
 * sesión de test válida, el middleware redirige a /sign-in. Siguiendo el patrón
 * del resto del repo (seguimientos.spec.ts, seguimientos-multi-deportista.spec.ts),
 * los tests que requieren sesión se marcan como skip hasta configurar los Clerk
 * Testing Tokens / storageState en playwright.config.ts.
 *
 * Para habilitarlos:
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con sesión válida (admin/profesional) y DB seedeada
 *    con al menos una disciplina (p.ej. "Fútbol") con categorías y deportistas
 *    asociados a esa disciplina/categoría.
 * 3. Referenciar el storageState en playwright.config.ts bajo use.storageState.
 *
 * Checklist QA verificado durante la review (no requiere auth):
 * - SeguimientoForm recibe `disciplinas: DisciplinaConCategorias[]` (default []);
 *   si está vacío NO renderiza los filtros (cubierto por SeguimientoForm.test.tsx).
 * - Estado local filtroDisciplina/filtroCategoria; elegir disciplina resetea
 *   categoría y el CustomSelect de categoría usa disabled={!filtroDisciplina}.
 * - categoriasFiltro deriva de disciplinas.find(...).categorias (solo las de la
 *   disciplina elegida) — cubierto por SeguimientoForm.test.tsx.
 * - DeportistaSelect agrega filter[disciplina]/filter[categoriaId] al fetch y los
 *   incluye en el queryKey para refetchear — cubierto por DeportistaSelect.test.tsx.
 * - Los chips ya seleccionados persisten al cambiar filtros (el filtro solo afecta
 *   las opciones del dropdown, no la selección).
 */

// ─── Auth gate (no requiere sesión: verifica el redirect) ────────────────────

test.describe('Seguimientos — filtro deportista en formulario — auth gate', () => {
  test('usuario no autenticado que va a crear un seguimiento es redirigido a /sign-in', async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto('/seguimientos/nuevo');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

// ─── Happy path — filtrar deportistas por disciplina y categoría ─────────────

test.describe('Seguimientos — filtro deportista en formulario — flujo autenticado', () => {
  test.skip(true, 'Requiere sesión de test de Clerk (storageState no configurado)');

  test('la categoría arranca deshabilitada y se habilita al elegir disciplina', async ({
    page,
  }) => {
    await page.goto('/seguimientos/nuevo');

    // El select de categoría (placeholder "Todas las categorías") arranca disabled.
    await expect(
      page.getByRole('button', { name: /Todas las categorías/i }),
    ).toBeDisabled();

    // Elegir una disciplina habilita la categoría con SOLO sus categorías.
    await page.getByRole('button', { name: /Todas las disciplinas/i }).click();
    await page.getByRole('button', { name: /^Fútbol$/i }).click();
    await expect(
      page.getByRole('button', { name: /Todas las categorías/i }),
    ).toBeEnabled();
  });

  test('el filtro de disciplina acota las opciones del multi-select de deportistas', async ({
    page,
  }) => {
    await page.goto('/seguimientos/nuevo');

    // Aplicar el filtro por disciplina.
    await page.getByRole('button', { name: /Todas las disciplinas/i }).click();
    await page.getByRole('button', { name: /^Fútbol$/i }).click();

    // Abrir el multi-select: las opciones ya vienen filtradas por disciplina.
    await page.getByRole('button', { name: /Buscar deportista/i }).click();
    await expect(page.getByRole('listitem').first()).toBeVisible();

    // Seleccionar el primer deportista disponible y verificar el chip.
    await page.getByRole('listitem').first().click();
    await expect(page.getByText(/1 deportista seleccionado/i)).toBeVisible();
  });

  test('los filtros no se persisten: crear el seguimiento guarda solo el deportista', async ({
    page,
  }) => {
    await page.goto('/seguimientos/nuevo');

    await page.getByRole('button', { name: /Todas las disciplinas/i }).click();
    await page.getByRole('button', { name: /^Fútbol$/i }).click();

    await page.getByRole('button', { name: /Buscar deportista/i }).click();
    await page.getByRole('listitem').first().click();
    await page.getByText('Título / Motivo').click();

    await page.getByLabel(/Fecha/).fill('2026-09-09');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Control con filtro por disciplina');

    await page.getByRole('button', { name: 'Guardar seguimiento' }).click();

    await expect(page).toHaveURL('/seguimientos');
    await expect(page.getByText('Control con filtro por disciplina')).toBeVisible();
  });
});
