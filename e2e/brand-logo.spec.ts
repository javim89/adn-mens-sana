import { test, expect } from '@playwright/test';

/**
 * El ícono de BioTeam (la "b" con el punto dorado) junto al wordmark, y los app icons.
 * Solo rutas públicas: la landing y /sign-in. Los app icons de BioTeam viven en
 * `public/brand/` y solo los declaran la landing y el superadmin; el resto hereda el
 * ícono neutro del root layout, y la app logueada usa los del club.
 */
test.describe('Logo de BioTeam', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('la landing muestra el ícono normal en el nav y el inverso en el footer, ambos decorativos', async ({ page }) => {
    await page.goto('/');

    const iconoNav = page.locator('header[data-morph-nav] img[data-logo-bioteam]');
    await expect(iconoNav).toBeVisible();
    await expect(iconoNav).toHaveAttribute('data-logo-bioteam', 'normal');
    await expect(iconoNav).toHaveAttribute('alt', '');
    await expect.poll(() => iconoNav.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: 'BioTeam, inicio' })).toBeVisible();

    const iconoFooter = page.locator('footer img[data-logo-bioteam]');
    await expect(iconoFooter).toHaveAttribute('data-logo-bioteam', 'inverso');
    await expect(iconoFooter).toHaveAttribute('alt', '');
  });

  test('/sign-in muestra el ícono inverso sobre el fondo azul', async ({ page }) => {
    await page.goto('/sign-in');
    const icono = page.locator('img[data-logo-bioteam]');
    await expect(icono).toBeVisible();
    await expect(icono).toHaveAttribute('data-logo-bioteam', 'inverso');
    await expect.poll(() => icono.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test('a 375px el nav con el ícono no genera scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('header[data-morph-nav] img[data-logo-bioteam]')).toBeVisible();
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBeLessThanOrEqual(0);
  });

  test('el <head> de la landing declara los íconos de BioTeam (en /brand) y se sirven', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('head link[rel="icon"], head link[rel="apple-touch-icon"]')
      .evaluateAll((links) => links.map((l) => l.getAttribute('href') ?? ''));

    const favicon = hrefs.find((h) => h.startsWith('/brand/favicon.ico'));
    const icono = hrefs.find((h) => h.startsWith('/brand/icon.svg'));
    const apple = hrefs.find((h) => h.startsWith('/brand/apple-icon.png'));
    expect(favicon).toBeTruthy();
    expect(icono).toBeTruthy();
    expect(apple).toBeTruthy();

    for (const href of [favicon!, icono!, apple!]) {
      const r = await request.get(href);
      expect(r.status(), href).toBe(200);
    }
    // Sin el ícono neutro ni los viejos icon.png / icon1.png.
    expect(hrefs.some((h) => h.includes('icono-neutro'))).toBe(false);
    expect(hrefs.some((h) => /\/icon1?\.png/.test(h))).toBe(false);
  });

  test('/sign-in hereda el ícono neutro del root layout, no el de BioTeam', async ({ page, request }) => {
    await page.goto('/sign-in');
    const hrefs = await page
      .locator('head link[rel="icon"], head link[rel="apple-touch-icon"]')
      .evaluateAll((links) => links.map((l) => l.getAttribute('href') ?? ''));

    expect(hrefs).toEqual(['/brand/icono-neutro.svg']);
    expect((await request.get('/brand/icono-neutro.svg')).status()).toBe(200);
  });
});
