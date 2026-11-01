import { test, expect, type Page } from '@playwright/test';

/**
 * Login con la marca de cada club (sin sesión). Usa los clubes de la base de
 * desarrollo: Gimnasia (con logo) y Club Prueba (sin logo). Ninguno tiene colores
 * propios, así que su tema es el default (navy de BioTeam); el login genérico usa
 * el tema neutro (gris). Comparar los dos alcanza para ver que el `<style>` del
 * club se aplica en `:root`, sin escribir colores en la base desde el test.
 */
const NAVY_DEFAULT = '#121a61';
const PRIMARIO_NEUTRO = '#1f2937';

async function primarioEnRoot(page: Page) {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--club-primario').trim().toLowerCase(),
  );
}

test.describe('Login por club', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('/c/gimnasia-la-plata/sign-in muestra la marca del club y nada de BioTeam', async ({ page }) => {
    const r = await page.goto('/c/gimnasia-la-plata/sign-in');
    expect(r?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/gimnasia/i);
    await expect(page.locator('style[data-tema-club]')).toHaveCount(1);
    expect(await primarioEnRoot(page)).toBe(NAVY_DEFAULT);

    const logo = page.locator('img[data-logo-club]');
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

    // Espera a que Clerk monte el form (su header, con el nombre de la app, va oculto).
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20_000 });
    expect(await page.locator('body').innerText()).not.toMatch(/bioteam/i);
    await expect(page).toHaveTitle(/gimnasia/i);
  });

  test('un club sin logo muestra sus iniciales', async ({ page }) => {
    await page.goto('/c/club-prueba/sign-in');
    await expect(page.locator('[data-iniciales-club]')).toBeVisible();
    await expect(page.locator('img[data-logo-club]')).toHaveCount(0);
  });

  test('/c/no-existe/sign-in da 404', async ({ page }) => {
    const r = await page.goto('/c/no-existe/sign-in');
    expect(r?.status()).toBe(404);
  });

  test('/sign-in genérico es neutro', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/\/sign-in$/);
    expect(await primarioEnRoot(page)).toBe(PRIMARIO_NEUTRO);
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20_000 });
    expect(await page.locator('body').innerText()).not.toMatch(/gimnasia/i);
  });

  test('con la cookie del último club, /sign-in manda al login del club', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'bt_club_slug', value: 'club-prueba', url: baseURL! }]);
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/\/c\/club-prueba\/sign-in$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/club prueba/i);
  });

  test('una ruta protegida sin sesión, con la cookie del club, termina en el login del club', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'bt_club_slug', value: 'club-prueba', url: baseURL! }]);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/c\/club-prueba\/sign-in$/);
  });

  test('/c/<slug>/entrar exige sesión', async ({ page }) => {
    await page.goto('/c/club-prueba/entrar');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
