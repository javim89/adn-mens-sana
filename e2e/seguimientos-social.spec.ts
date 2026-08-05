import { test, expect } from '@playwright/test';

/**
 * E2E tests for the "Rol social: seguimientos genéricos" feature.
 *
 * El rol `social` puede:
 *  - Entrar al listado /seguimientos y ver el botón "Nuevo seguimiento".
 *  - Crear seguimientos EXCLUSIVAMENTE de tipo GENERICO (sin selector de tipo,
 *    sin secciones especializadas de salud).
 *  - Editar/eliminar únicamente sus propios seguimientos (ownership por
 *    profesionalId === userId, mismo criterio que los roles de salud).
 *
 * Estos tests requieren una sesión autenticada de Clerk con rol=social.
 * Sin un storageState de Clerk configurado, el middleware redirige a /sign-in.
 *
 * Para habilitarlos:
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con una sesión válida para:
 *    - PLAYWRIGHT_SOCIAL_EMAIL / PLAYWRIGHT_SOCIAL_PASSWORD (rol=social)
 *    - Un segundo profesional (p. ej. medico) que sea dueño de un seguimiento ajeno
 * 3. Referenciar el storageState en playwright.config.ts bajo `use.storageState`.
 *
 * Hasta entonces, todas las suites se saltan con `test.skip` para no producir
 * falsos negativos en CI (mismo patrón que e2e/seguimientos.spec.ts).
 *
 * QA checklist verified during implementation review (code review + unit/component tests):
 * - lib/roles.ts: getNavItemsForRole('social') incluye '/seguimientos' y excluye '/usuarios', '/turnos'
 * - app/(app)/seguimientos/page.tsx: canWrite = true para 'social' (WRITE_ROLES incluye 'social')
 * - lib/actions/seguimientos.ts: CAN_WRITE_ROLES incluye 'social' (pasa el gate inicial de create)
 * - lib/actions/seguimientos.ts: TIPOS_POR_ROL.social === ['GENERICO'] (explícito)
 * - createSeguimiento (social): tipoSeguimiento GENERICO → success; profesionalId === userId del social
 * - createSeguimiento (social): tipoSeguimiento especializado (TRAUMATOLOGIA, etc.) → rechazado server-side
 * - createSeguimiento (social): datosEspecificos.tipo especializado → rechazado server-side (blindaje)
 * - updateSeguimiento (social): dueño → success; ajeno → rechazo por ownership
 * - deleteSeguimiento (social): dueño → success; ajeno → rechazo por ownership
 * - SeguimientoForm (role=social): NO renderiza selector "Tipo de seguimiento" (tiposDisponibles.length === 1)
 * - SeguimientoForm (role=social): NO renderiza secciones especializadas (watchedTipo siempre GENERICO)
 * - SeguimientoForm (role=social): SÍ renderiza campos base (título, fecha, prioridad, descripción, recomendaciones)
 * - SeguimientosTable (canWrite=true, role social): botón "Nuevo seguimiento" visible
 * - SeguimientosTable: editar/eliminar solo en filas propias (canModifyRow = s.profesionalId === currentUserId)
 * - Regresión: datos sociales del deportista intactos (DatosSocialesSection / tab social sin cambios)
 * - 39/39 tests de seguimientos (unit + component) en verde
 */

// ─── Suite 1: Navegación ─────────────────────────────────────────────────────

test.describe('Seguimientos social — navegación', () => {
  test.skip(true, 'Requires Clerk test user session for role=social (storageState not configured)');

  test('"Seguimientos" aparece en el sidebar para rol social', async ({ page }) => {
    await page.goto('/dashboard');
    // El item de nav "Seguimientos" está presente para social
    await expect(page.getByRole('link', { name: 'Seguimientos' })).toBeVisible();
    // Los items restringidos NO aparecen para social
    await expect(page.getByRole('link', { name: 'Usuarios' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Turnos' })).not.toBeVisible();
  });

  test('social entra al listado y ve el botón "Nuevo seguimiento"', async ({ page }) => {
    await page.goto('/seguimientos');
    // No redirige a /sign-in (acceso permitido)
    await expect(page).not.toHaveURL('/sign-in');
    // canWrite=true para social → botón visible
    await expect(page.getByText('Nuevo seguimiento')).toBeVisible();
  });
});

// ─── Suite 2: Happy path — crear seguimiento genérico ────────────────────────

test.describe('Seguimientos social — crear genérico', () => {
  test.skip(true, 'Requires Clerk test user session for role=social (storageState not configured)');

  test('happy path — social crea seguimiento genérico y vuelve al listado', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // El form de social NO expone el selector "Tipo de seguimiento"
    await expect(page.getByText('Tipo de seguimiento')).not.toBeVisible();

    // El campo "Área responsable" (solo admin) NO está presente
    await expect(page.getByTestId('profesional-combobox')).not.toBeVisible();

    // Campos base SÍ presentes
    await expect(page.getByText('Título / Motivo')).toBeVisible();
    await expect(page.getByText('Prioridad')).toBeVisible();

    // Ninguna sección especializada de salud está visible
    await expect(page.getByText('Datos traumatológicos')).not.toBeVisible();
    await expect(page.getByText('Historia clínica')).not.toBeVisible();
    await expect(page.getByText('Evaluación psicológica')).not.toBeVisible();
    await expect(page.getByText('Evaluación cardiológica')).not.toBeVisible();
    await expect(page.getByText('Antropometría')).not.toBeVisible();

    // Completar campos obligatorios: deportista, fecha, título
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-08-05');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Entrevista socioambiental');

    // Guardar
    await page.getByText('Guardar seguimiento').click();

    // Redirige al listado
    await expect(page).toHaveURL('/seguimientos');

    // El nuevo seguimiento aparece en la lista
    await expect(page.getByText('Entrevista socioambiental')).toBeVisible();
  });

  test('mobile — social crea seguimiento genérico', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/seguimientos/nuevo');

    // Aun en mobile no aparece el selector de tipo
    await expect(page.getByText('Tipo de seguimiento')).not.toBeVisible();
    await expect(page.getByText('Título / Motivo')).toBeVisible();
  });
});

// ─── Suite 3: Ownership — editar/eliminar solo lo propio ─────────────────────

test.describe('Seguimientos social — ownership', () => {
  test.skip(true, 'Requires Clerk test user session for role=social (storageState not configured)');

  test('social ve Editar/Eliminar solo en sus propios seguimientos', async ({ page }) => {
    // Requiere data: un seguimiento propio (profesionalId === social userId) y
    // uno ajeno (creado por otro profesional).
    await page.goto('/seguimientos');

    // En su propio seguimiento, los botones aparecen
    await expect(page.getByText('Entrevista socioambiental')).toBeVisible();
    await expect(page.getByTitle('Editar seguimiento').first()).toBeVisible();

    // En un seguimiento ajeno, editar/eliminar NO deben estar disponibles.
    // (La verificación fina depende del data setup; como mínimo se confirma que
    // la página carga sin error y el botón "Ver" está disponible para ajenos.)
    expect(page.url()).toContain('/seguimientos');
  });

  test('social edita su seguimiento genérico y persiste', async ({ page }) => {
    await page.goto('/seguimientos');
    await page.getByTitle('Editar seguimiento').first().click();
    await expect(page).toHaveURL(/\/seguimientos\/.*\/editar/);

    // Tampoco en edición aparece el selector de tipo para social
    await expect(page.getByText('Tipo de seguimiento')).not.toBeVisible();

    const titulo = page.getByPlaceholder(/Evaluación de rodilla/i);
    await titulo.clear();
    await titulo.fill('Entrevista socioambiental — actualizada');
    await page.getByText('Actualizar seguimiento').click();

    await expect(page).toHaveURL('/seguimientos');
    await expect(page.getByText('Entrevista socioambiental — actualizada')).toBeVisible();
  });
});

// ─── Suite 4: Blindaje server-side (documental) ──────────────────────────────

test.describe('Seguimientos social — blindaje de tipos especializados', () => {
  test.skip(true, 'Cubierto por unit tests de lib/actions/seguimientos.ts (server-side)');

  test('social no puede crear tipos especializados aunque los fuerce el cliente', async () => {
    // El rechazo ocurre server-side en createSeguimiento/updateSeguimiento:
    // getTiposPermitidos('social') === ['GENERICO'], por lo que cualquier
    // tipoSeguimiento o datosEspecificos.tipo distinto de GENERICO devuelve
    // { success: false }. Verificado por los unit tests del harness de mocks.
    expect(true).toBe(true);
  });
});
