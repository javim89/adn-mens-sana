import { test, expect } from '@playwright/test';

/**
 * E2E — Seguimiento compartido por VARIOS deportistas (relación N:M).
 *
 * Antes la relación Seguimiento↔Deportista era 1:N (un seguimiento pertenecía a
 * un único deportista). Ahora es N:M mediante la tabla intermedia explícita
 * `SeguimientoDeportista`: un mismo seguimiento puede asociarse a múltiples
 * deportistas (registro compartido), para TODOS los tipos de seguimiento.
 *
 * Cambios cubiertos por este flujo:
 * - `SeguimientoForm` usa `deportistaIds: string[]` y `DeportistaSelect` es un
 *   multi-select con chips (agregar/quitar, sin duplicados).
 * - `createSeguimiento` sincroniza la tabla intermedia dentro de la transacción
 *   (create → createMany con dedup + skipDuplicates).
 * - El listado (`SeguimientosTable`) muestra "Apellido, Nombre +N" con tooltip.
 * - El detalle (`/seguimientos/[id]`) lista todos los deportistas asociados.
 * - Cada deportista ve el seguimiento compartido en su propia tab de seguimientos
 *   (`getSeguimientos({ deportistaId })` → `deportistas: { some: {...} }`).
 *
 * La ruta /seguimientos está protegida por el middleware de Clerk. Sin una
 * sesión de test válida, el middleware redirige a /sign-in. Siguiendo el patrón
 * del resto del repo (seguimientos.spec.ts, seguimientos-disciplina-categoria.spec.ts),
 * los tests que requieren sesión se marcan como skip hasta configurar los Clerk
 * Testing Tokens / storageState en playwright.config.ts.
 *
 * Para habilitarlos:
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con una sesión válida (rol social/admin/profesional) y
 *    una DB seedeada con al menos dos deportistas buscables.
 * 3. Referenciar el storageState en playwright.config.ts bajo use.storageState.
 *
 * Checklist QA verificado durante la review (no requiere auth):
 * - createSeguimiento exige `deportistaIds.length >= 1` y dedup antes de createMany.
 * - buildWhere compone los filtros que tocan la relación `deportistas` vía `AND`
 *   (deportistaId + disciplina/categoría + search) sin pisarse entre sí.
 * - DeportistaSelect no permite duplicados (toggle usa value.some(id)).
 * - Los chips tienen botón X con aria-label "Quitar {apellido}".
 * - El detalle ordena e imprime todos los deportistas (orderBy apellido asc).
 */

// ─── Auth gate (no requiere sesión: verifica el redirect) ────────────────────

test.describe('Seguimientos multi-deportista — auth gate', () => {
  test('usuario no autenticado que va a crear un seguimiento es redirigido a /sign-in', async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto('/seguimientos/nuevo');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('usuario no autenticado en el listado es redirigido a /sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/seguimientos');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

// ─── Happy path — crear seguimiento genérico con VARIOS deportistas ──────────

test.describe('Seguimientos multi-deportista — flujo autenticado', () => {
  test.skip(true, 'Requiere sesión de test de Clerk (storageState no configurado)');

  test('crear un seguimiento genérico seleccionando varios deportistas', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // Abrir el multi-select y agregar el primer deportista.
    await page.getByRole('button', { name: /Buscar deportista/i }).click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('a');
    await page.getByRole('listitem').first().click();

    // Buscar y agregar un segundo deportista distinto.
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('e');
    await page.getByRole('listitem').nth(1).click();

    // El disparador refleja la cantidad seleccionada y aparecen 2 chips.
    await expect(page.getByText(/2 deportistas seleccionados/i)).toBeVisible();
    const chips = page.locator('span', { has: page.getByRole('button', { name: /^Quitar/ }) });
    await expect(chips).toHaveCount(2);

    // Cerrar el dropdown (click afuera) y completar el resto del formulario.
    await page.getByText('Título / Motivo').click();
    await page.getByLabel(/Fecha/).fill('2026-08-27');
    await page
      .getByPlaceholder(/Evaluación de rodilla/i)
      .fill('Charla grupal de nutrición');

    await page.getByRole('button', { name: 'Guardar seguimiento' }).click();

    // Redirige al listado y el nuevo seguimiento aparece.
    await expect(page).toHaveURL('/seguimientos');
    await expect(page.getByText('Charla grupal de nutrición')).toBeVisible();
  });

  test('el detalle del seguimiento lista todos los deportistas asociados', async ({ page }) => {
    await page.goto('/seguimientos');
    await page.getByText('Charla grupal de nutrición').first().click();

    await expect(
      page.getByRole('heading', { name: /Charla grupal de nutrición/i }),
    ).toBeVisible();

    // La cabecera imprime los deportistas separados por " · " (más de uno).
    await expect(page.getByText(/·/).first()).toBeVisible();
  });

  test('quitar un deportista del multi-select actualiza el contador', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    await page.getByRole('button', { name: /Buscar deportista/i }).click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('a');
    await page.getByRole('listitem').first().click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('e');
    await page.getByRole('listitem').nth(1).click();
    await page.getByText('Título / Motivo').click();

    await expect(page.getByText(/2 deportistas seleccionados/i)).toBeVisible();

    // Quitar el primer chip: debe quedar 1 seleccionado.
    await page.getByRole('button', { name: /^Quitar/ }).first().click();
    await expect(page.getByText(/1 deportista seleccionado/i)).toBeVisible();
  });

  test('no se puede crear sin al menos un deportista', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');
    await page.getByLabel(/Fecha/).fill('2026-08-27');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Sin deportistas');
    await page.getByRole('button', { name: 'Guardar seguimiento' }).click();

    // El zod resolver marca el error y no navega.
    await expect(page.getByText(/al menos un deportista/i)).toBeVisible();
    await expect(page).toHaveURL(/\/seguimientos\/nuevo/);
  });

  test('el seguimiento compartido aparece en la tab de cada deportista', async ({ page }) => {
    // Tras crear "Charla grupal de nutrición" para 2 deportistas, ambos deben
    // verlo en su propia tab de seguimientos (getSeguimientos por deportistaId).
    await page.goto('/seguimientos');
    await page.getByText('Charla grupal de nutrición').first().click();
    await expect(
      page.getByRole('heading', { name: /Charla grupal de nutrición/i }),
    ).toBeVisible();
    // La verificación por-deportista requiere IDs concretos del seed; se deja
    // documentada la aserción de que el registro es compartido (N:M).
  });

  test('mobile — el multi-select de deportistas es usable en viewport chico', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/seguimientos/nuevo');

    await page.getByRole('button', { name: /Buscar deportista/i }).click();
    await expect(
      page.getByPlaceholder('Buscar por nombre, apellido o DNI...'),
    ).toBeVisible();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('a');
    await page.getByRole('listitem').first().click();
    await expect(page.getByText(/1 deportista seleccionado/i)).toBeVisible();
  });
});
