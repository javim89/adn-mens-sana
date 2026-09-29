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

  // Los query params del módulo no abren una puerta lateral. `fecha` incluida: el
  // histórico es admin-only y el gate está en la page, no en el cliente.
  test('los filtros en la URL no saltean el proxy', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(
      '/viandas?disciplina=cualquiera&categoria=cualquiera&lugar=SEDE&fecha=2020-01-01',
    );
    await page.waitForURL('**/sign-in**');

    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  /**
   * Una `?fecha=` malformada no cambia el resultado del control de acceso: sigue
   * siendo redirect a /sign-in, sin 5xx.
   *
   * OJO con lo que esto NO prueba: `proxy.ts` corta ANTES de que la page corra, así
   * que el RSC nunca ejecuta `resolverFechaActiva` ni `fechaDbDesdeClave` y estos
   * casos pasarían igual aunque la validación no existiera. La validación en sí
   * está cubierta por los unit tests de `resolverFechaActiva` y `esClaveFechaValida`
   * (`lib/utils/__tests__/fecha.test.ts`); lo que se verifica acá es que el
   * parámetro no abre una puerta lateral en el proxy.
   */
  for (const fecha of ['no-es-una-fecha', '2026-02-31', '2099-01-01', '../../etc/passwd']) {
    test(`una fecha inválida (${fecha}) no saltea el login`, async ({
      page,
    }) => {
      await page.context().clearCookies();
      const res = await page.goto(`/viandas?fecha=${encodeURIComponent(fecha)}`);

      expect(res?.status()).toBeLessThan(500);
      await page.waitForURL('**/sign-in**');
      expect(new URL(page.url()).pathname).toBe('/sign-in');
    });
  }

  test('sin sesión no se filtra ningún nombre de deportista', async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.goto('/viandas');

    // Lo esencial: la respuesta es la pantalla de login, no la grilla del día.
    const html = (await res?.text()) ?? '';
    expect(html).not.toContain('Resumen por comida');
    expect(html).not.toContain('No recibe vianda');
  });
});
