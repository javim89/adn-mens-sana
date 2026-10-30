import { test, expect } from '@playwright/test';

/**
 * Logo e íconos públicos de un club (sin sesión). Usa el club de Gimnasia de la base
 * de desarrollo, que tiene logo en S3, y Club Prueba, que no tiene.
 */
test.describe('Marca pública del club', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('el logo del club se sirve como PNG con nosniff, sin sesión', async ({ request }) => {
    const r = await request.get('/api/clubes/gimnasia-la-plata/logo', { maxRedirects: 0 });
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toBe('image/png');
    expect(r.headers()['x-content-type-options']).toBe('nosniff');
    const bytes = await r.body();
    expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  for (const tam of [32, 180]) {
    test(`el ícono de ${tam}px del club es un PNG, sin sesión`, async ({ request }) => {
      const r = await request.get(`/api/clubes/gimnasia-la-plata/icono?tam=${tam}`, { maxRedirects: 0 });
      expect(r.status()).toBe(200);
      expect(r.headers()['content-type']).toBe('image/png');
    });
  }

  test('un club sin logo: 404 en el logo, ícono con iniciales igual', async ({ request }) => {
    expect((await request.get('/api/clubes/club-prueba/logo', { maxRedirects: 0 })).status()).toBe(404);
    const icono = await request.get('/api/clubes/club-prueba/icono?tam=32', { maxRedirects: 0 });
    expect(icono.status()).toBe(200);
    expect(icono.headers()['content-type']).toBe('image/png');
  });

  test('un club inexistente: 404', async ({ request }) => {
    expect((await request.get('/api/clubes/no-existe/logo', { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get('/api/clubes/no-existe/icono', { maxRedirects: 0 })).status()).toBe(404);
  });

  test('el presign del logo exige sesión', async ({ request }) => {
    const r = await request.post('/api/club/logo/presign', { maxRedirects: 0, data: {} });
    expect([307, 401]).toContain(r.status());
  });

  test('/configuracion sin sesión manda a /sign-in', async ({ page }) => {
    await page.goto('/configuracion');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
