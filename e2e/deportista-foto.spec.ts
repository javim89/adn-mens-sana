import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — foto de perfil del deportista (S3).
 *
 * Requiere una sesión de Clerk (ver e2e/deportistas.spec.ts). Hasta que exista
 * un storageState para e2e, la suite queda en skip.
 *
 * S3 se mockea con page.route: el PUT prefirmado responde 200 y el GET de la
 * imagen devuelve un PNG de 1x1, así no hace falta un bucket real.
 */

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function mockS3(page: Page) {
  await page.route(/\.amazonaws\.com\//, async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ status: 200 });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1x1 });
  });
}

test.describe('Deportistas — foto de perfil (sin sesión)', () => {
  test('auth gate — el presign no entrega URL de subida sin sesión', async ({ request }) => {
    const res = await request.post('/api/deportistas/foto/presign', {
      headers: { 'Content-Type': 'application/vnd.api+json' },
      data: { data: { type: 'foto-upload', attributes: { contentType: 'image/png', size: 10 } } },
      maxRedirects: 0,
    });

    expect(res.status()).not.toBe(200);
    expect(await res.text()).not.toContain('uploadUrl');
  });

  test('auth gate — el descarte de fotos no responde 204 sin sesión', async ({ request }) => {
    const res = await request.delete(
      '/api/deportistas/foto?key=deportistas/123e4567-e89b-12d3-a456-426614174000.jpg',
      { maxRedirects: 0 },
    );

    expect(res.status()).not.toBe(204);
  });
});

test.describe('Deportistas — foto de perfil', () => {
  test.skip(true, 'Requires Clerk test user session (storageState not configured)');

  test('crear con foto, verla en el detalle y quitarla en la edición', async ({ page }) => {
    await mockS3(page);

    await page.goto('/deportistas/nuevo');
    await page.getByLabel(/apellido \*/i).fill('FotoE2E');
    await page.getByLabel(/nombre \*/i).fill('Runner');
    await page.getByLabel(/dni \*/i).fill('22333444');
    await page.getByLabel(/fecha de nacimiento/i).fill('2001-03-10');

    await page.getByLabel('Seleccionar foto de perfil').setInputFiles({
      name: 'foto.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    });
    await expect(page.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute('src', /^blob:/);
    await expect(page.getByRole('button', { name: 'Cambiar' })).toBeVisible();

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9-]+$/);

    const avatar = page.getByRole('img', { name: 'FotoE2E, Runner' });
    await expect(avatar).toHaveAttribute('src', /amazonaws\.com/);

    await page.getByRole('link', { name: 'Editar' }).click();
    await expect(page).toHaveURL(/\/editar$/);
    await page.getByRole('button', { name: 'Quitar' }).click();
    await expect(page.getByRole('button', { name: 'Subir foto' })).toBeVisible();
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page).toHaveURL(/\/deportistas\/[a-z0-9-]+$/);
    await expect(page.getByRole('img', { name: 'FotoE2E, Runner' })).toHaveText('RF');
  });
});
