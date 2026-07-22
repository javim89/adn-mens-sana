import { test, expect } from '@playwright/test';

/**
 * E2E — Módulo Calendario (Fixture Torneo Juveniles 2026).
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
 * - Filtro por categoriaId (directo) — cubierto por component tests.
 * - Coloreo de días por tipo (torneo/receso/recupero/sin actividad) — component tests.
 * - Nav item /calendario presente para todos los roles en lib/roles.ts.
 */

test.describe('Calendario — happy path', () => {
  test.skip(true, 'Requiere sesión de test de Clerk (storageState no configurado)');

  test('carga /calendario y muestra la vista Mes con eventos', async ({ page }) => {
    await page.goto('/calendario');
    await expect(page.getByRole('heading', { name: 'Calendario' })).toBeVisible();
    // El grid mensual de FullCalendar está presente.
    await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();
    // Al menos un evento de GIMNASIA (LP) visible.
    await expect(page.getByText(/GIMNASIA \(LP\)/).first()).toBeVisible();
  });

  test('permite cambiar de vista Mes a vista Año', async ({ page }) => {
    await page.goto('/calendario');
    await page.getByRole('button', { name: 'Año' }).click();
    await expect(page.locator('.fc-multiMonthYear-view')).toBeVisible();
  });

  test('filtra los eventos por categoría', async ({ page }) => {
    await page.goto('/calendario');
    await page.getByRole('button', { name: 'Categoría' }).click();
    await page.getByRole('button', { name: '5ta' }).click();
    // Solo eventos de 5ta visibles.
    await expect(page.getByText(/^5ta ·/).first()).toBeVisible();
  });
});
