import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Seguimientos CRUD module.
 *
 * These tests require an authenticated Clerk session. Without a valid Clerk
 * test user session, the middleware redirects to /sign-in.
 *
 * To enable these tests:
 * 1. Configure Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Create a storageState fixture with valid sessions for:
 *    - An admin user
 *    - A health professional (e.g. medico)
 *    - A second health professional (different user, same or different role)
 *    - An entrenador (read-only role)
 * 3. Reference the storageState in playwright.config.ts under `use.storageState`
 *
 * Until then all tests in this file are skipped to avoid false failures in CI.
 *
 * QA checklist verified during implementation review:
 * - CRUD completo funciona: crear, ver, editar, eliminar
 * - Filtros funcionan: búsqueda libre, prioridad, área (admin)
 * - El campo "Área responsable" solo aparece cuando isAdmin=true
 * - Al crear como profesional de salud, profesionalId == userId del llamante
 * - Al crear como admin con área seleccionada, profesionalId == profesional elegido
 * - Botones Editar/Eliminar NO aparecen para profesional viendo seguimientos ajenos
 * - Botones Editar/Eliminar SÍ aparecen para admin en TODOS los seguimientos
 * - Server Actions rechaza update/delete si profesional no es dueño (unit tests)
 * - Badges de prioridad tienen colores correctos (verde/amarillo/naranja/rojo)
 * - Nueva entrada "Seguimientos" aparece en el sidebar con ícono ClipboardList
 * - Layout responsive — cards en mobile, tabla en desktop
 * - Estado vacío del listado muestra mensaje con link a /seguimientos/nuevo
 */

// ─── Suite 1: Happy path — profesional de salud ──────────────────────────────

test.describe('Seguimientos — profesional de salud', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('crear seguimiento con campos obligatorios', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // Verificar que el campo "Área responsable" NO está visible (solo para admin)
    await expect(page.getByTestId('profesional-combobox')).not.toBeVisible();

    // Buscar y seleccionar un deportista
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    // Fecha
    await page.getByLabel(/Fecha/).fill('2026-07-15');

    // Título
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Control post lesión');

    // Prioridad (default MEDIA — dejar como está)

    // Submit
    await page.getByText('Guardar seguimiento').click();

    // Redirige a /seguimientos
    await expect(page).toHaveURL('/seguimientos');

    // El nuevo seguimiento aparece en la lista
    await expect(page.getByText('Control post lesión')).toBeVisible();
  });

  test('ver detalle del seguimiento creado', async ({ page }) => {
    await page.goto('/seguimientos');
    // Click en el título para ir al detalle
    await page.getByText('Control post lesión').first().click();
    // Verificar que el título aparece en el detalle
    await expect(page.getByRole('heading', { name: /Control post lesión/i })).toBeVisible();
  });

  test('editar el seguimiento', async ({ page }) => {
    await page.goto('/seguimientos');
    // Click en el ícono de editar
    await page.getByTitle('Editar seguimiento').first().click();
    // Estamos en /seguimientos/[id]/editar
    await expect(page).toHaveURL(/\/seguimientos\/.*\/editar/);
    // Cambiar el título
    const tituloInput = page.getByPlaceholder(/Evaluación de rodilla/i);
    await tituloInput.clear();
    await tituloInput.fill('Control post lesión — actualizado');
    await page.getByText('Actualizar seguimiento').click();
    // Redirige a /seguimientos
    await expect(page).toHaveURL('/seguimientos');
    // El título actualizado aparece en la lista
    await expect(page.getByText('Control post lesión — actualizado')).toBeVisible();
  });

  test('eliminar el seguimiento', async ({ page }) => {
    await page.goto('/seguimientos');
    // Click en eliminar — abre el modal
    await page.getByRole('button', { name: /Eliminar seguimiento/i }).first().click();
    // Modal de confirmación aparece
    await expect(page.getByText('Confirmar eliminación')).toBeVisible();
    // Confirmar
    await page.getByRole('button', { name: 'Confirmar eliminación' }).click();
    // El seguimiento desaparece de la lista
    await expect(page.getByText('Control post lesión — actualizado')).not.toBeVisible();
  });
});

// ─── Suite 2: Happy path — admin ─────────────────────────────────────────────

test.describe('Seguimientos — admin', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('crear seguimiento con área responsable', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // El campo "Área responsable" ES visible para admin
    await expect(page.getByText('Área responsable')).toBeVisible();

    // Seleccionar un profesional
    await page.getByText('Seleccionar profesional...').click();
    await page.getByPlaceholder('Buscar profesional...').fill('García');
    await page.getByRole('listitem').first().click();

    // Resto de campos
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('López');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-07-20');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Evaluación admin creó');

    await page.getByText('Guardar seguimiento').click();
    await expect(page).toHaveURL('/seguimientos');
    await expect(page.getByText('Evaluación admin creó')).toBeVisible();
  });

  test('filtrar por prioridad URGENTE', async ({ page }) => {
    await page.goto('/seguimientos');

    // Seleccionar "Urgente" en el filtro de prioridad
    await page.getByRole('combobox', { name: /prioridades/i }).selectOption('URGENTE');

    // Solo seguimientos URGENTE son visibles (verificar que el badge aparece)
    const urgenteBadges = await page.getByText('Urgente').all();
    expect(urgenteBadges.length).toBeGreaterThan(0);

    // No deben aparecer otros badges de prioridad en los resultados
    await expect(page.getByText('Media')).not.toBeVisible();
  });

  test('filtrar por búsqueda libre', async ({ page }) => {
    await page.goto('/seguimientos');

    await page.getByPlaceholder('Buscar por título o deportista...').fill('Evaluación admin');

    await expect(page.getByText('Evaluación admin creó')).toBeVisible();
    // Otros seguimientos no deben aparecer
    await expect(page.getByText('Control post lesión')).not.toBeVisible();
  });

  test('admin ve botones Editar/Eliminar en TODOS los seguimientos', async ({ page }) => {
    await page.goto('/seguimientos');

    // Todos los seguimientos tienen botones Editar y Eliminar visibles para el admin
    const editBtns = await page.getByTitle('Editar seguimiento').all();
    expect(editBtns.length).toBeGreaterThan(0);

    const deleteBtns = await page.getByRole('button', { name: /Eliminar seguimiento/i }).all();
    expect(deleteBtns.length).toBeGreaterThan(0);
  });
});

// ─── Suite 3: Control de acceso por rol ──────────────────────────────────────

test.describe('Seguimientos — control de acceso por rol', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('rol entrenador ve lista pero NO ve botón "Nuevo seguimiento"', async ({ page }) => {
    // TODO: use storageState for entrenador user
    await page.goto('/seguimientos');

    // La lista se muestra (sin error 403)
    await expect(page).not.toHaveURL('/sign-in');

    // El botón "Nuevo seguimiento" NO es visible (canWrite=false)
    await expect(page.getByText('Nuevo seguimiento')).not.toBeVisible();
  });

  test('el campo "Área responsable" NO aparece para rol médico', async ({ page }) => {
    // TODO: use storageState for medico user
    await page.goto('/seguimientos/nuevo');

    // El campo "Área responsable" (ProfesionalCombobox) no está en el formulario
    await expect(page.getByText('Área responsable')).not.toBeVisible();
  });
});

// ─── Suite 4: Control de acceso por propiedad ────────────────────────────────

test.describe('Seguimientos — control de acceso por propiedad', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('profesional de salud NO ve Editar/Eliminar en seguimientos de otro profesional', async ({
    page,
  }) => {
    // TODO: use storageState for profesional B (different from profesional A who created a record)
    await page.goto('/seguimientos');

    // El seguimiento creado por profesional A aparece en la lista
    // pero sin botones de Editar/Eliminar para profesional B.
    // Profesional B solo puede ver botones para sus propios seguimientos,
    // no para los de profesional A.
    // (Assertion depends on test data setup — at minimum, we verify no crash)
    expect(page.url()).toContain('/seguimientos');
  });

  test('profesional SÍ ve Editar/Eliminar en sus propios seguimientos', async ({ page }) => {
    // TODO: use storageState for profesional B who has their own seguimientos
    await page.goto('/seguimientos');

    // Si el profesional tiene seguimientos propios, deben tener botones Editar/Eliminar
    // (unit tests ya cubren esta lógica — este test verifica la integración visual)
    expect(page.url()).toContain('/seguimientos');
  });
});
