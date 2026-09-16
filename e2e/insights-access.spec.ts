import { test, expect } from '@playwright/test';

/**
 * Control de acceso del módulo Insights — SIN sesión.
 *
 * Es el único spec de Insights que corre de verdad hoy: no necesita un usuario
 * de Clerk, así que no depende del `storageState` que el proyecto todavía no
 * tiene configurado (ver `e2e/insights.spec.ts`).
 *
 * Verifica la primera línea de defensa: `proxy.ts` exige sesión para todo lo
 * que no sea /sign-in ni /sign-up. El guard por ROL (solo admin) vive en
 * `app/(app)/insights/layout.tsx` y en cada server action, y está cubierto por
 * los tests unitarios de `lib/actions/__tests__/insights.test.ts` y
 * `app/api/insights/query/__tests__/route.test.ts`.
 */
test.describe('Insights — acceso sin sesión', () => {
  test('/insights redirige a /sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/insights');
    await page.waitForURL('**/sign-in**');

    const url = new URL(page.url());
    expect(url.pathname).toBe('/sign-in');
  });

  test('el detalle de un dashboard también redirige', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/insights/cualquier-id');
    await page.waitForURL('**/sign-in**');
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  test('el editor también redirige', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/insights/cualquier-id/editar');
    await page.waitForURL('**/sign-in**');
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  test('la API de queries no responde datos sin sesión', async ({ request }) => {
    const res = await request.post('/api/insights/query', {
      data: {
        spec: {
          mode: 'builder',
          dataset: 'deportistas',
          dimensions: [],
          measures: ['cantidad'],
        },
      },
      // Sin esto Playwright sigue el redirect y termina en el HTML de /sign-in,
      // que responde 200 — el status dejaría de significar nada.
      maxRedirects: 0,
    });

    // El proxy corta el pedido antes de llegar al handler.
    expect(res.status()).toBe(307);
    expect(res.headers()['location']).toContain('/sign-in');

    // Y lo esencial: no vuelve ni una fila.
    expect(await res.text()).not.toContain('cantidad');
  });
});
