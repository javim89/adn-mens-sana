import { test, expect } from '@playwright/test';

/**
 * `/bienvenida` — acceso sin sesión.
 *
 * La página vive fuera del grupo `(app)` (el layout de `(app)` redirige ahí cuando
 * el usuario no tiene ningún club), pero NO es pública: acepta invitaciones a
 * nombre del usuario logueado, así que `proxy.ts` tiene que cortarla igual que el
 * resto. El comportamiento con sesión (aceptar y seguir, o el aviso de "sin
 * acceso") está cubierto en `app/bienvenida/__tests__/page.test.tsx`.
 */
test.describe('Bienvenida — acceso sin sesión', () => {
  test('/bienvenida redirige a /sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/bienvenida');
    await page.waitForURL('**/sign-in**');

    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  test('la cookie de club activo no reemplaza a la sesión', async ({ page, baseURL }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      { name: 'bt_club', value: 'club_gimnasia_lp', url: baseURL ?? 'http://localhost:3000' },
    ]);
    await page.goto('/dashboard');
    await page.waitForURL('**/sign-in**');

    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });
});
