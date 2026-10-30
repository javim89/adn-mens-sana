import { test, expect } from '@playwright/test';

/**
 * `/superadmin/clubes` — acceso sin sesión.
 *
 * El panel de clubes no es público: `proxy.ts` lo corta antes de llegar al guard
 * del layout (que con sesión pero sin ser superadmin responde 404). El guard está
 * cubierto en `app/(superadmin)/__tests__/layout.test.tsx`.
 */
test.describe('Superadmin — acceso sin sesión', () => {
  test('/superadmin/clubes redirige a /sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/superadmin/clubes');
    await page.waitForURL('**/sign-in**');

    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });
});
