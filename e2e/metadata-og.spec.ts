import { test, expect, type Page, type Response } from '@playwright/test';

/**
 * Open Graph y metadata del sitio por segmento (solo lectura, sin sesión salvo el
 * caso de `/dashboard`, que se skippea igual que `dashboard.spec.ts`).
 *
 * - La landing es la única con la OG de BioTeam (imagen, twitter card, canonical, index).
 * - El login genérico es neutro: noindex, sin imagen ni "BioTeam".
 * - El login del club lleva el nombre del club en og:title/og:site_name, noindex y sin imagen.
 * - `robots.txt` y `sitemap.xml` son públicos (no pasan por /sign-in); el sitemap lista la
 *   landing y las páginas de `/funcionalidades`.
 *
 * `og:image` es absoluta con el `metadataBase` del entorno (`NEXT_PUBLIC_APP_URL`), que
 * cambia entre local, Docker y Netlify: se compara el pathname y la imagen se pide
 * contra el `baseURL` del test.
 *
 * Clubes de la base de desarrollo (los mismos que `club-login.spec.ts`): Gimnasia y
 * Club Prueba.
 */

const SLUG_CLUB = 'gimnasia-la-plata';

/** Las URLs del sitemap: la landing, el índice de funcionalidades y sus 10 páginas. */
const PATHS_SITEMAP = [
  '/',
  '/funcionalidades',
  ...[
    'ficha-del-deportista',
    'seguimientos-medicos',
    'triage-deportivo',
    'turnos',
    'presentismo',
    'convocatorias',
    'viandas',
    'calendario',
    'insights',
    'branding-del-club',
  ].map((slug) => `/funcionalidades/${slug}`),
];

/** `content` del `<meta property|name=…>`, o null si no está. */
async function meta(page: Page, clave: string): Promise<string | null> {
  const loc = page.locator(`head meta[property="${clave}"], head meta[name="${clave}"]`);
  if ((await loc.count()) === 0) return null;
  return loc.first().getAttribute('content');
}

/** Todos los `og:*` y `twitter:*` del `<head>`, como texto. */
async function metasSociales(page: Page): Promise<string[]> {
  return page
    .locator('head meta[property^="og:"], head meta[name^="og:"], head meta[name^="twitter:"], head meta[property^="twitter:"]')
    .evaluateAll((els) => els.map((e) => `${e.getAttribute('property') ?? e.getAttribute('name')}=${e.getAttribute('content')}`));
}

/** Pathnames locales de la cadena de redirects (ignora el handshake de Clerk dev). */
function cadenaLocal(respuesta: Response | null, baseURL: string): string[] {
  const host = new URL(baseURL).host;
  const urls: string[] = [];
  for (let r = respuesta?.request() ?? null; r; r = r.redirectedFrom()) urls.push(r.url());
  return urls.map((u) => new URL(u)).filter((u) => u.host === host).map((u) => u.pathname);
}

/** Lo que comparten el login genérico y el del club: noindex, sin imagen, sin BioTeam. */
async function esperarSinMarcaBioTeam(page: Page) {
  expect(await meta(page, 'robots')).toMatch(/noindex/);
  expect(await meta(page, 'og:image')).toBeNull();
  expect(await meta(page, 'twitter:image')).toBeNull();
  expect(await page.title()).not.toMatch(/bioteam/i);
  for (const m of await metasSociales(page)) expect(m).not.toMatch(/bioteam|og-image/i);
  await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
}

test.describe('Metadata y Open Graph', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('landing: OG completa de BioTeam con imagen absoluta, canonical e index', async ({ page, request }) => {
    const respuesta = await page.goto('/');
    expect(respuesta?.status()).toBe(200);

    await expect(page).toHaveTitle(/^BioTeam/);
    expect(await meta(page, 'og:title')).toMatch(/^BioTeam/);
    expect(await meta(page, 'og:description')).toBeTruthy();
    expect(await meta(page, 'og:type')).toBe('website');
    expect(await meta(page, 'og:locale')).toBe('es_AR');
    expect(await meta(page, 'og:site_name')).toBe('BioTeam');
    expect(await meta(page, 'og:url')).toBeTruthy();

    const imagen = await meta(page, 'og:image');
    expect(imagen).toMatch(/^https?:\/\//);
    expect(new URL(imagen!).pathname).toBe('/brand/og-image.png');
    expect(await meta(page, 'og:image:width')).toBe('1200');
    expect(await meta(page, 'og:image:height')).toBe('630');
    expect((await meta(page, 'og:image:alt'))?.trim()).toBeTruthy();

    expect(await meta(page, 'twitter:card')).toBe('summary_large_image');
    expect(await meta(page, 'twitter:image')).toBeTruthy();

    await expect(page.locator('head link[rel="canonical"]')).toHaveCount(1);
    expect(await meta(page, 'robots')).not.toMatch(/noindex/);

    // La imagen se pide contra el baseURL del test, no contra el host de metadataBase.
    const r = await request.get(new URL(imagen!).pathname, { maxRedirects: 0 });
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toBe('image/png');
    const bytes = (await r.body()).length;
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThan(300 * 1024);
  });

  test('landing en mobile: mantiene la OG y el theme-color', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    expect(await meta(page, 'og:site_name')).toBe('BioTeam');
    expect(await meta(page, 'theme-color')).toBeTruthy();
  });

  test('/sign-in: neutro, noindex, sin imagen ni BioTeam', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/\/sign-in$/);
    await esperarSinMarcaBioTeam(page);
    expect(await meta(page, 'og:site_name')).toBeNull();
  });

  for (const slug of [SLUG_CLUB, 'club-prueba']) {
    test(`/c/${slug}/sign-in: OG del club, noindex y sin imagen`, async ({ page }) => {
      const r = await page.goto(`/c/${slug}/sign-in`);
      expect(r?.status()).toBe(200);
      await esperarSinMarcaBioTeam(page);

      const club = await meta(page, 'og:site_name');
      expect(club?.trim()).toBeTruthy();
      expect(await meta(page, 'og:title')).toBe(`Ingresar · ${club}`);
      await expect(page).toHaveTitle(`Ingresar · ${club}`);
      // El nombre del club es el mismo que muestra la marca del login.
      await expect(page.getByRole('heading', { level: 1 })).toContainText(club!);
    });
  }

  test('/dashboard sin sesión: termina en el login, sin la OG de BioTeam', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/sign-in**');
    await esperarSinMarcaBioTeam(page);
  });

  test('/dashboard con sesión: noindex, sin imagen y title "<Sección> · <Club>"', async ({ page }) => {
    test.skip(true, 'Requiere sesión de Clerk (storageState sin configurar en el proyecto, ver dashboard.spec.ts)');
    await page.goto('/dashboard');
    expect(await meta(page, 'robots')).toMatch(/noindex/);
    expect(await meta(page, 'og:image')).toBeNull();
    expect(await meta(page, 'og:site_name')).not.toBe('BioTeam');
    await expect(page).toHaveTitle(/^Dashboard · .+/);
    expect(await page.title()).not.toMatch(/bioteam/i);
  });

  test('/robots.txt: 200 sin pasar por el login, con Sitemap y Disallow de /api/', async ({ request, page, baseURL }) => {
    const r = await request.get('/robots.txt', { maxRedirects: 0 });
    expect(r.status()).toBe(200);
    const texto = await r.text();
    expect(texto).toMatch(/Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/);
    expect(texto).toContain('Disallow: /api/');

    // Como documento (con el handshake de Clerk dev de por medio) tampoco va al login.
    const doc = await page.goto('/robots.txt');
    expect(doc?.status()).toBe(200);
    expect(cadenaLocal(doc, baseURL!)).not.toContain('/sign-in');
  });

  test('/sitemap.xml: 200 sin pasar por el login, con 12 <loc> únicos y absolutos (landing + funcionalidades)', async ({ request, page, baseURL }) => {
    const r = await request.get('/sitemap.xml', { maxRedirects: 0 });
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toMatch(/xml/);
    const xml = await r.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toHaveLength(12);
    for (const loc of locs) expect(loc).toMatch(/^https?:\/\//);
    expect(new Set(locs).size).toBe(12);
    expect(new Set(locs.map((l) => new URL(l).pathname))).toEqual(new Set(PATHS_SITEMAP));

    const doc = await page.goto('/sitemap.xml');
    expect(doc?.status()).toBe(200);
    expect(cadenaLocal(doc, baseURL!)).not.toContain('/sign-in');
  });

  test('landing: title y og:title con la keyword "Software de gestión para clubes deportivos"', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('BioTeam — Software de gestión para clubes deportivos');
    expect(await meta(page, 'og:title')).toBe('BioTeam — Software de gestión para clubes deportivos');
  });

  test('subdominio del club: /funcionalidades/* va con 308 al dominio raíz, mismo path', async ({ request }) => {
    const dominio = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    test.skip(!dominio, 'Sin NEXT_PUBLIC_ROOT_DOMAIN en el entorno de test (el servicio e2e de Docker lo deja vacío)');
    const protocolo = dominio!.startsWith('localhost') ? 'http' : 'https';
    for (const path of ['/funcionalidades', '/funcionalidades/turnos?ref=x']) {
      const r = await request.get(`${protocolo}://${SLUG_CLUB}.${dominio}${path}`, { maxRedirects: 0 });
      expect(r.status(), path).toBe(308);
      expect(r.headers()['location'], path).toBe(`${protocolo}://${dominio}${path}`);
    }
    // El resto de los redirects del subdominio siguen siendo temporales.
    const raiz = await request.get(`${protocolo}://${SLUG_CLUB}.${dominio}/`, { maxRedirects: 0 });
    expect(raiz.status()).toBe(307);
  });

  test('subdominio del club: <slug>.<dominio>/sign-in con la OG del club', async ({ page }) => {
    const dominio = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    test.skip(!dominio, 'Sin NEXT_PUBLIC_ROOT_DOMAIN en el entorno de test (el servicio e2e de Docker lo deja vacío)');
    const protocolo = dominio!.startsWith('localhost') ? 'http' : 'https';
    const r = await page.goto(`${protocolo}://${SLUG_CLUB}.${dominio}/sign-in`);
    expect(r?.status()).toBe(200);
    await esperarSinMarcaBioTeam(page);
    const club = await meta(page, 'og:site_name');
    expect(club?.trim()).toBeTruthy();
    expect(await meta(page, 'og:title')).toBe(`Ingresar · ${club}`);
  });
});
