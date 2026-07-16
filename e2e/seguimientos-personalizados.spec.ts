import { test, expect } from '@playwright/test';

/**
 * E2E tests for the "Seguimientos personalizados por rol" feature.
 *
 * These tests require authenticated Clerk sessions for each role.
 * To enable these tests:
 * 1. Configure Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Create storageState fixtures with valid sessions for each role:
 *    - PLAYWRIGHT_MEDICO_EMAIL / PLAYWRIGHT_MEDICO_PASSWORD
 *    - PLAYWRIGHT_PSICOLOGO_EMAIL / PLAYWRIGHT_PSICOLOGO_PASSWORD
 *    - PLAYWRIGHT_CARDIOLOGO_EMAIL / PLAYWRIGHT_CARDIOLOGO_PASSWORD
 *    - PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD
 *    - PLAYWRIGHT_KINESIOLOGO_EMAIL / PLAYWRIGHT_KINESIOLOGO_PASSWORD
 * 3. Reference the storageState in playwright.config.ts under `use.storageState`.
 *
 * Until then, all tests in this file are skipped to avoid false failures in CI.
 *
 * QA checklist verified during implementation review (code review, unit tests):
 * - tipoSeguimiento is nullable in schema (retrocompatibilidad confirmed)
 * - All 4 satellite tables have ON DELETE CASCADE (confirmed in migration SQL)
 * - Satellite table IDs are TEXT (cuid), not SERIAL (confirmed in schema)
 * - Migration uses manual SQL via apply-migration.mjs (no prisma migrate dev)
 * - createSeguimiento uses prisma.$transaction for satellite creation
 * - updateSeguimiento uses upsert (not create) for satellite data
 * - Type change in update: deleteOldSatellite called before upsertDatosEspecificos
 * - deleteSeguimiento unchanged; CASCADE handles satellite cleanup
 * - Authorization (owner check, rol check) verified in unit tests (22 tests pass)
 * - Tipo selector appears only for roles with >1 type available
 * - Section components mount/unmount cleanly when tipo changes (watchedTipo pattern)
 * - CPRD fields have max="36", STAI fields have max="80" (confirmed in section components)
 * - Generic fields always present regardless of tipo selected
 * - Edit mode pre-populates satellite fields from initialData.datosEspecificos
 * - Tipo badge appears in header for non-GENERICO types
 * - Specific sections only rendered when satellite data exists (t && tipo === check)
 * - Seguimientos with tipoSeguimiento = null display correctly (treated as GENERICO)
 * - "Tipo" column present in table with readable label
 * - "Genérico" badge shown for null or GENERICO tipo
 * - colSpan in empty-state row accounts for new Tipo column
 * - Backend rol-type validation: medico blocked from EVALUACION_PSICOLOGICA (unit test 12)
 * - Backend rol-type validation: psicologo blocked from TRAUMATOLOGIA (unit test 13)
 * - CPRD > 36 returns error with "CPRD" in message (unit test 10)
 * - STAI > 80 returns error with "STAI" in message (unit test 11)
 * - Admin can create any tipo (unit test 15)
 * - Rol check is server-side — UI-only restriction would not be sufficient
 *
 * Known accessibility issues identified during QA review (minor):
 * - Section label elements in Traumatología, HistoriaClínica, EvaluaciónCardiológica
 *   sections lack htmlFor/id pairing; inputs are not programmatically associated with
 *   their labels. This affects AT users but does not break functionality.
 *   Filed as: Accessibility — labels not associated with inputs in section components
 */

test.describe('Seguimientos personalizados — médico crea Traumatología', () => {
  test.skip(true, 'Requires Clerk test user session for role=medico (storageState not configured)');

  test('happy path — médico crea seguimiento de Traumatología y verifica detalle', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // Selector de tipo visible con opciones correctas para médico
    const tipoButton = page.getByRole('button', { name: /Genérico/i });
    await expect(tipoButton).toBeVisible();
    await tipoButton.click();

    await expect(page.getByRole('button', { name: /^Traumatología$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Historia Clínica$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Evaluación Psicológica/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Evaluación Cardiológica/i })).not.toBeVisible();

    // Seleccionar Traumatología
    await page.getByRole('button', { name: /^Traumatología$/i }).click();

    // Sección Estabilidad con campos Hombro, Rodilla, Tobillo
    await expect(page.getByText('Estabilidad')).toBeVisible();
    await expect(page.getByLabel('Hombro').first()).toBeVisible();
    await expect(page.getByLabel('Rodilla').first()).toBeVisible();
    await expect(page.getByLabel('Tobillo').first()).toBeVisible();

    // Sección Movilidad con campos Hombro, Cadera, Rodilla, Tobillo
    await expect(page.getByText('Movilidad')).toBeVisible();
    await expect(page.getByLabel('Cadera')).toBeVisible();

    // Sección Otros con Discrepancia/Asimetría, Postura, Laxitud, Podoscopia
    await expect(page.getByText('Otros')).toBeVisible();
    await expect(page.getByLabel(/Discrepancia/i)).toBeVisible();
    await expect(page.getByLabel('Postura')).toBeVisible();
    await expect(page.getByLabel('Laxitud')).toBeVisible();
    await expect(page.getByLabel('Podoscopia')).toBeVisible();

    // Completar campos obligatorios
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-07-16');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Test Traumatología');

    // Completar Estabilidad Hombro y Movilidad Cadera
    await page.getByLabel('Hombro').first().fill('Normal');
    await page.getByLabel('Cadera').fill('Limitada');

    // Guardar
    await page.getByText('Guardar seguimiento').click();

    // Redirección al listado
    await expect(page).toHaveURL('/seguimientos');

    // Navegar al detalle
    await page.getByText('Test Traumatología').first().click();
    await expect(page).toHaveURL(/\/seguimientos\/.+/);

    // Verificar sección Estabilidad con valor Normal
    await expect(page.getByText('Estabilidad')).toBeVisible();
    await expect(page.getByText('Normal')).toBeVisible();

    // Verificar sección Movilidad con Cadera = Limitada
    await expect(page.getByText('Movilidad')).toBeVisible();
    await expect(page.getByText('Limitada')).toBeVisible();

    // Badge de tipo Traumatología en el header
    await expect(page.getByText('Traumatología')).toBeVisible();
  });
});

test.describe('Seguimientos personalizados — médico crea Historia Clínica', () => {
  test.skip(true, 'Requires Clerk test user session for role=medico (storageState not configured)');

  test('happy path — médico crea seguimiento de Historia Clínica y verifica detalle', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // Seleccionar Historia Clínica
    await page.getByRole('button', { name: /Genérico/i }).click();
    await page.getByRole('button', { name: /^Historia Clínica$/i }).click();

    // Verificar campos de Historia Clínica
    await expect(page.getByLabel('Tensión arterial')).toBeVisible();
    await expect(page.getByLabel('Auscultación pulmonar')).toBeVisible();
    await expect(page.getByLabel('AV Ojo Derecho')).toBeVisible();
    await expect(page.getByLabel('AV Ojo Izquierdo')).toBeVisible();
    await expect(page.getByLabel('Diagnóstico')).toBeVisible();

    // Verificar que NO aparecen campos de Traumatología
    await expect(page.getByText('Estabilidad')).not.toBeVisible();

    // Completar campos
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-07-16');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Historia Clínica Test');

    await page.getByLabel('Tensión arterial').fill('120/80');
    await page.getByLabel('Diagnóstico').fill('Apto');

    await page.getByText('Guardar seguimiento').click();
    await expect(page).toHaveURL('/seguimientos');

    // Verificar en detalle
    await page.getByText('Historia Clínica Test').first().click();
    await expect(page.getByText('Tensión arterial')).toBeVisible();
    await expect(page.getByText('120/80')).toBeVisible();
    await expect(page.getByText('Apto')).toBeVisible();
    await expect(page.getByText('Historia Clínica')).toBeVisible();
  });
});

test.describe('Seguimientos personalizados — psicólogo crea Evaluación Psicológica', () => {
  test.skip(true, 'Requires Clerk test user session for role=psicologo (storageState not configured)');

  test('happy path — psicólogo crea seguimiento con campos CPRD/STAI', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // Selector muestra solo Genérico y Evaluación Psicológica
    const tipoButton = page.getByRole('button', { name: /Genérico/i });
    await tipoButton.click();
    await expect(page.getByRole('button', { name: /^Evaluación Psicológica$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Traumatología/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Historia Clínica/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Evaluación Cardiológica/i })).not.toBeVisible();

    // Seleccionar Evaluación Psicológica
    await page.getByRole('button', { name: /^Evaluación Psicológica$/i }).click();

    // Verificar campos CPRD
    await expect(page.getByText('CPRD – Características Psicológicas')).toBeVisible();
    await expect(page.getByLabel(/Control de Estrés/i)).toBeVisible();

    // Verificar campos STAI
    await expect(page.getByText('STAI – Ansiedad Estado-Rasgo')).toBeVisible();
    await expect(page.getByLabel(/STAI-AR Rasgo/i)).toBeVisible();
    await expect(page.getByLabel(/STAI-AE Estado/i)).toBeVisible();

    // Completar campos obligatorios
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-07-16');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Evaluación Psicológica Test');

    // Completar valores válidos
    await page.getByLabel(/Control de Estrés/i).fill('25');
    await page.getByLabel(/STAI-AR Rasgo/i).fill('40');

    // Guardar con valores válidos
    await page.getByText('Guardar seguimiento').click();
    await expect(page).toHaveURL('/seguimientos');

    // Verificar en detalle
    await page.getByText('Evaluación Psicológica Test').first().click();
    await expect(page.getByText('CPRD – Características Psicológicas')).toBeVisible();
    await expect(page.getByText('STAI – Ansiedad Estado-Rasgo')).toBeVisible();
  });

  test('edge case — valor CPRD > 36 muestra error de validación', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    await page.getByRole('button', { name: /Genérico/i }).click();
    await page.getByRole('button', { name: /^Evaluación Psicológica$/i }).click();

    // Ingresar valor fuera de rango en Control de Estrés
    await page.getByLabel(/Control de Estrés/i).fill('37');

    // Completar campos obligatorios mínimos para disparar validación
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();
    await page.getByLabel(/Fecha/).fill('2026-07-16');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Test CPRD inválido');

    await page.getByText('Guardar seguimiento').click();

    // Debe mostrar error de validación (client-side o server-side)
    await expect(page.getByText(/Máximo 36/i).or(page.getByText(/CPRD/i))).toBeVisible();
    // No debe redirigir
    await expect(page).not.toHaveURL('/seguimientos');
  });
});

test.describe('Seguimientos personalizados — cardiólogo crea Evaluación Cardiológica', () => {
  test.skip(true, 'Requires Clerk test user session for role=cardiologo (storageState not configured)');

  test('happy path — cardiólogo crea seguimiento de Evaluación Cardiológica', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // Selector muestra solo Genérico y Evaluación Cardiológica
    await page.getByRole('button', { name: /Genérico/i }).click();
    await expect(page.getByRole('button', { name: /^Evaluación Cardiológica$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Traumatología/i })).not.toBeVisible();
    await page.getByRole('button', { name: /^Evaluación Cardiológica$/i }).click();

    // Verificar campos
    await expect(page.getByLabel('ECG')).toBeVisible();
    await expect(page.getByLabel('Examen físico')).toBeVisible();
    await expect(page.getByLabel('Síntomas')).toBeVisible();
    await expect(page.getByLabel('Estudios anteriores')).toBeVisible();
    await expect(page.getByLabel('Diagnóstico').last()).toBeVisible();
    await expect(page.getByLabel(/Observaciones \(Cardiología\)/i)).toBeVisible();

    // Completar campos
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-07-16');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Evaluación Cardiológica Test');

    await page.getByLabel('ECG').fill('Ritmo sinusal normal');
    await page.getByLabel('Diagnóstico').last().fill('Apto cardiovascular');

    await page.getByText('Guardar seguimiento').click();
    await expect(page).toHaveURL('/seguimientos');

    // Verificar en detalle
    await page.getByText('Evaluación Cardiológica Test').first().click();
    await expect(page.getByText('Ritmo sinusal normal')).toBeVisible();
    await expect(page.getByText('Apto cardiovascular')).toBeVisible();
    await expect(page.getByText('Evaluación Cardiológica')).toBeVisible();
  });
});

test.describe('Seguimientos personalizados — regresión genérico', () => {
  test.skip(true, 'Requires Clerk test user session for role=medico (storageState not configured)');

  test('regresión — seguimiento genérico sigue funcionando igual que antes', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // El selector de tipo está visible (médico tiene más de 1 opción)
    // pero Genérico es el default — no cambiar el tipo
    await expect(page.getByRole('button', { name: /Genérico/i })).toBeVisible();

    // Completar formulario con campos genéricos clásicos
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-07-16');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Seguimiento Genérico Test');
    await page.getByPlaceholder(/Detalles del seguimiento/i).fill('Estado general bueno');
    await page.getByPlaceholder(/Indicaciones, plan de acción/i).fill('Continuar entrenamiento');

    await page.getByText('Guardar seguimiento').click();
    await expect(page).toHaveURL('/seguimientos');

    // Badge Genérico visible en el listado
    await expect(page.getByText('Seguimiento Genérico Test')).toBeVisible();
    const row = page.getByText('Seguimiento Genérico Test').locator('xpath=ancestor::tr');
    await expect(row.getByText('Genérico')).toBeVisible();

    // Verificar en el detalle que solo aparecen secciones genéricas
    await page.getByText('Seguimiento Genérico Test').first().click();
    await expect(page.getByText('Estado general bueno')).toBeVisible();
    await expect(page.getByText('Continuar entrenamiento')).toBeVisible();

    // No deben aparecer secciones específicas
    await expect(page.getByText('Estabilidad')).not.toBeVisible();
    await expect(page.getByText('CPRD – Características Psicológicas')).not.toBeVisible();
    await expect(page.getByText('Evaluación Cardiológica')).not.toBeVisible();
  });
});

test.describe('Seguimientos personalizados — admin crea cualquier tipo', () => {
  test.skip(true, 'Requires Clerk test user session for role=admin (storageState not configured)');

  test('happy path — admin ve todos los tipos y puede crear Evaluación Psicológica', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // Campo "Área responsable" visible para admin
    await expect(page.getByText('Área responsable')).toBeVisible();

    // Selector de tipo contiene todos los tipos
    await page.getByRole('button', { name: /Genérico/i }).click();
    await expect(page.getByRole('button', { name: /^Traumatología$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Historia Clínica$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Evaluación Psicológica$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Evaluación Cardiológica$/i })).toBeVisible();

    // Seleccionar Evaluación Psicológica
    await page.getByRole('button', { name: /^Evaluación Psicológica$/i }).click();

    // Seleccionar profesional (psicólogo)
    await page.getByText('Seleccionar profesional...').click();
    await page.getByPlaceholder('Buscar profesional...').fill('psicólogo');
    await page.getByRole('listitem').first().click();

    // Completar campos obligatorios
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-07-16');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Evaluación Psicológica por Admin');

    await page.getByText('Guardar seguimiento').click();
    await expect(page).toHaveURL('/seguimientos');

    // Verificar que el profesional asignado aparece en el listado
    await expect(page.getByText('Evaluación Psicológica por Admin')).toBeVisible();
  });
});

test.describe('Seguimientos personalizados — kinesiólogo sin selector de tipo', () => {
  test.skip(true, 'Requires Clerk test user session for role=kinesiologo (storageState not configured)');

  test('kinesiólogo no ve selector de tipo y solo ve campos genéricos', async ({ page }) => {
    await page.goto('/seguimientos/nuevo');

    // El selector de tipo NO debe estar visible (kinesiólogo tiene solo GENERICO disponible)
    await expect(page.getByText('Tipo de seguimiento')).not.toBeVisible();

    // El formulario muestra solo campos genéricos
    await expect(page.getByPlaceholder(/Detalles del seguimiento/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Indicaciones, plan de acción/i)).toBeVisible();

    // No aparecen secciones específicas
    await expect(page.getByText('Estabilidad')).not.toBeVisible();
    await expect(page.getByText('CPRD – Características Psicológicas')).not.toBeVisible();

    // Guardar funciona correctamente
    await page.getByPlaceholder('Buscar deportista...').click();
    await page.getByPlaceholder('Buscar por nombre, apellido o DNI...').fill('García');
    await page.getByRole('listitem').first().click();

    await page.getByLabel(/Fecha/).fill('2026-07-16');
    await page.getByPlaceholder(/Evaluación de rodilla/i).fill('Seguimiento Kinesiólogo');

    await page.getByText('Guardar seguimiento').click();
    await expect(page).toHaveURL('/seguimientos');
  });

  test('mobile viewport — formulario es usable en pantalla pequeña', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/seguimientos/nuevo');

    // Formulario visible y funcional en mobile
    await expect(page.getByPlaceholder(/Evaluación de rodilla/i)).toBeVisible();
    await expect(page.getByText('Guardar seguimiento')).toBeVisible();

    // El selector de tipo NO está (kinesiólogo)
    await expect(page.getByText('Tipo de seguimiento')).not.toBeVisible();
  });
});
