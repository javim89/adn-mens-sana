import { test, expect } from '@playwright/test';

/**
 * Control de acceso del módulo de Viandas — SIN sesión.
 *
 * Es el spec de Viandas que corre de verdad hoy: no necesita un usuario de Clerk,
 * así que no depende del `storageState` que el proyecto todavía no tiene
 * configurado (ver `e2e/viandas.spec.ts`).
 *
 * Verifica la primera línea de defensa: `proxy.ts` exige sesión para todo lo que
 * no sea /sign-in ni /sign-up. El guard por ROL (admin + responsable_viandas)
 * vive en `app/(app)/viandas/page.tsx` y se revalida en cada server action; eso
 * está cubierto por `lib/actions/__tests__/viandas.test.ts`.
 */
test.describe('Viandas — acceso sin sesión', () => {
  test('/viandas redirige a /sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/viandas');
    await page.waitForURL('**/sign-in**');

    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  // Los query params del módulo no abren una puerta lateral.
  test('los filtros en la URL no saltean el proxy', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/viandas?disciplina=cualquiera&categoria=cualquiera&lugar=SEDE');
    await page.waitForURL('**/sign-in**');

    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  test('sin sesión no se filtra ningún nombre de deportista', async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.goto('/viandas');

    // Lo esencial: la respuesta es la pantalla de login, no la grilla del día.
    const html = (await res?.text()) ?? '';
    expect(html).not.toContain('Resumen por comida');
    expect(html).not.toContain('No recibe vianda');
  });
});
