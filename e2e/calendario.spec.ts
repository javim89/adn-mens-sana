import { test, expect } from '@playwright/test';

/**
 * E2E — Módulo Calendario (fixture del club, abre en el mes de hoy).
 *
 * /calendario está protegido por el middleware de Clerk. Sin una sesión de test
 * válida, el middleware redirige a /sign-in. Estos tests siguen el patrón del
 * resto del repo (deportistas.spec.ts, sidebar-nav.spec.ts): se marcan como
 * skip hasta configurar los Clerk Testing Tokens / storageState en
 * playwright.config.ts.
 *
 * Para habilitarlos:
 * 1. Configurar Clerk Testing Tokens: https://clerk.com/docs/testing/playwright
 * 2. Crear un storageState con una sesión válida (rol admin o profesional).
 * 3. Referenciar el storageState en playwright.config.ts bajo use.storageState.
 *
 * Checklist QA verificado durante la review (no requiere auth):
 * - La ruta app/(app)/calendario/page.tsx es Server Component y llama getCalendarioData().
 * - CalendarioView es Client Component ('use client'); FullCalendar se carga con
 *   next/dynamic ssr:false para evitar problemas de SSR con React 19 / Next 16.
 * - Filtro por categoría (chip sincronizado con ?categoria=) — cubierto por component tests.
 * - Toolbar propia (anterior/siguiente, Mes/Año) y columna "Próximos partidos".
 * - Coloreo de días por tipo (torneo/receso/recupero/sin actividad) — component tests.
 * - Nav item /calendario presente para todos los roles en lib/roles.ts.
 */

test.describe('Calendario — happy path', () => {
  test.skip(true, 'Requiere sesión de test de Clerk (storageState no configurado)');

  test('carga /calendario en el mes de hoy, con la columna de próximos partidos', async ({ page }) => {
    await page.goto('/calendario');
    await expect(page.getByRole('heading', { level: 1, name: /^Temporada \d{4}$/ })).toBeVisible();
    await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Próximos partidos' })).toBeVisible();
  });

  test('anterior/siguiente navegan por mes', async ({ page }) => {
    await page.goto('/calendario');
    const titulo = page.locator('[aria-live="polite"]');
    const antes = await titulo.textContent();
    await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await expect(titulo).not.toHaveText(antes ?? '');
  });

  test('permite cambiar de vista Mes a vista Año', async ({ page }) => {
    await page.goto('/calendario');
    await page.getByRole('button', { name: 'Año', exact: true }).click();
    await expect(page.locator('.fc-multiMonthYear-view')).toBeVisible();
  });

  test('filtra los eventos por categoría y lo deja en la URL', async ({ page }) => {
    await page.goto('/calendario');
    await page.getByRole('button', { name: 'Categoría' }).click();
    await page.getByRole('option', { name: '5ta' }).click();
    await expect(page).toHaveURL(/categoria=/);
    await expect(page.getByRole('button', { name: 'Categoría: 5ta' })).toBeVisible();
  });
});
