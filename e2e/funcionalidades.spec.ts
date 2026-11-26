import { test, expect, type Page, type Response } from '@playwright/test';

/**
 * Sección pública `/funcionalidades` (índice + una página por funcionalidad), sin sesión.
 *
 * - Pública: no pasa por /sign-in (`proxy.ts`), con canonical propio, `index` y JSON-LD.
 * - El JSON-LD va en un solo `<script type="application/ld+json">` con `@graph`: los
 *   tipos se buscan arriba y dentro del grafo.
 * - Slug desconocido → 404 (`dynamicParams = false`).
 * - Sin scroll horizontal a 375 / 768 / 1440 px.
 *
 * Los slugs y H1 son los de `app/_landing/funcionalidades/catalogo.ts`: se repiten acá a
 * propósito, para que un cambio de URL (que rompe links y SEO) haga fallar el E2E.
 */

const RUTA = '/funcionalidades';

const PAGINAS = [
  { slug: 'ficha-del-deportista', nombre: 'Ficha del deportista', h1: 'Ficha integral del deportista para clubes deportivos' },
  { slug: 'seguimientos-medicos', nombre: 'Seguimientos médicos', h1: 'Historia clínica y seguimientos médicos para clubes deportivos' },
  { slug: 'triage-deportivo', nombre: 'Triage deportivo', h1: 'Triage deportivo para priorizar a cada deportista del plantel' },
  { slug: 'turnos', nombre: 'Turnos', h1: 'Agenda de turnos médicos para clubes deportivos' },
  { slug: 'presentismo', nombre: 'Presentismo', h1: 'Control de asistencia a entrenamientos para clubes deportivos' },
  { slug: 'convocatorias', nombre: 'Convocatorias', h1: 'Convocatorias a partidos para cada categoría del club' },
  { slug: 'viandas', nombre: 'Viandas', h1: 'Control de viandas y comidas para deportistas del club' },
  { slug: 'calendario', nombre: 'Calendario', h1: 'Calendario del torneo con los partidos de cada categoría' },
  { slug: 'insights', nombre: 'Insights', h1: 'Tableros de datos y KPIs para clubes deportivos' },
  { slug: 'branding-del-club', nombre: 'Tu club, tu marca', h1: 'Software para clubes con tu marca, usuarios y roles' },
] as const;

const rutaDe = (slug: string) => `${RUTA}/${slug}`;

/** `content` del `<meta property|name=…>`, o null si no está. */
async function meta(page: Page, clave: string): Promise<string | null> {
  const loc = page.locator(`head meta[property="${clave}"], head meta[name="${clave}"]`);
  if ((await loc.count()) === 0) return null;
  return loc.first().getAttribute('content');
}

/** Pathnames locales de la cadena de redirects (ignora el handshake de Clerk dev). */
function cadenaLocal(respuesta: Response | null, baseURL: string): string[] {
  const host = new URL(baseURL).host;
  const urls: string[] = [];
  for (let r = respuesta?.request() ?? null; r; r = r.redirectedFrom()) urls.push(r.url());
  return urls.map((u) => new URL(u)).filter((u) => u.host === host).map((u) => u.pathname);
}

type NodoLd = Record<string, unknown>;

/** Parsea cada `script[type=application/ld+json]` (falla si alguno no es JSON) y aplana `@graph`. */
async function nodosJsonLd(page: Page): Promise<NodoLd[]> {
  const textos = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(textos.length).toBeGreaterThan(0);
  const nodos: NodoLd[] = [];
  for (const texto of textos) {
    const valor = JSON.parse(texto) as NodoLd;
    expect(valor['@context']).toBe('https://schema.org');
    nodos.push(valor);
    if (Array.isArray(valor['@graph'])) nodos.push(...(valor['@graph'] as NodoLd[]));
  }
  return nodos;
}

function tipos(nodos: NodoLd[]): string[] {
  return nodos.map((n) => n['@type']).filter((t): t is string => typeof t === 'string');
}

/** Headings visibles para tecnologías asistivas (fuera de `aria-hidden`), en orden. */
async function nivelesDeHeadings(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      .filter((h) => !h.closest('[aria-hidden="true"]'))
      .map((h) => Number(h.tagName.slice(1))),
  );
}

/** Canonical, robots e índice sin noindex: lo común a todas las páginas indexables. */
async function esperarIndexable(page: Page, pathname: string) {
  const canonical = page.locator('head link[rel="canonical"]');
  await expect(canonical).toHaveCount(1);
  expect(new URL((await canonical.getAttribute('href'))!).pathname).toBe(pathname);
  const robots = await meta(page, 'robots');
  expect(robots).not.toMatch(/noindex/);
  expect(await meta(page, 'og:site_name')).toBe('BioTeam');
  expect(new URL((await meta(page, 'og:url'))!).pathname).toBe(pathname);
}

async function esperarSinScrollHorizontal(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe('Funcionalidades — índice', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('happy path — sin sesión responde 200 con un H1, 10 tarjetas, canonical, index y JSON-LD', async ({ page, baseURL }) => {
    const respuesta = await page.goto(RUTA);
    expect(respuesta?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(RUTA);
    expect(cadenaLocal(respuesta, baseURL!)).not.toContain('/sign-in');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Funcionalidades para gestionar tu club deportivo');

    const tarjetas = page.getByRole('region', { name: 'Todas las funcionalidades' }).getByRole('link');
    await expect(tarjetas).toHaveCount(PAGINAS.length);
    const hrefs = await tarjetas.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(new Set(hrefs)).toEqual(new Set(PAGINAS.map((p) => rutaDe(p.slug))));

    await esperarIndexable(page, RUTA);
    await expect(page).toHaveTitle(/BioTeam/);

    const nodos = await nodosJsonLd(page);
    expect(tipos(nodos)).toEqual(expect.arrayContaining(['BreadcrumbList', 'ItemList']));
    const lista = nodos.find((n) => n['@type'] === 'ItemList')!;
    expect(lista.itemListElement as unknown[]).toHaveLength(PAGINAS.length);

    // La pantalla del tablero es decorativa y lleva texto visible.
    const figura = page.locator('figure').first();
    await expect(figura.locator('[aria-hidden="true"][inert]')).toHaveCount(1);
    await expect(figura.locator('figcaption')).not.toBeEmpty();

    // Jerarquía sin saltos: el primero es el H1 y nunca se baja más de un nivel.
    const niveles = await nivelesDeHeadings(page);
    expect(niveles[0]).toBe(1);
    for (let i = 1; i < niveles.length; i++) expect(niveles[i] - niveles[i - 1]).toBeLessThanOrEqual(1);
  });

  test('edge case — slug inexistente responde 404', async ({ page, request }) => {
    const r = await request.get(`${RUTA}/no-existe`, { maxRedirects: 0 });
    expect(r.status()).toBe(404);
    const doc = await page.goto(`${RUTA}/no-existe`);
    expect(doc?.status()).toBe(404);
    expect(new URL(page.url()).pathname).toBe(`${RUTA}/no-existe`);
  });

  test('edge case — /funcionalidadesx no queda abierto (sigue detrás del guard)', async ({ page }) => {
    await page.goto('/funcionalidadesx');
    await page.waitForURL('**/sign-in**');
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  test('cada página tiene un title propio', async ({ request }) => {
    const titulos: string[] = [];
    for (const p of PAGINAS) {
      const r = await request.get(rutaDe(p.slug), { maxRedirects: 0 });
      expect(r.status(), rutaDe(p.slug)).toBe(200);
      const titulo = /<title>([^<]*)<\/title>/.exec(await r.text())?.[1]?.trim();
      expect(titulo, rutaDe(p.slug)).toBeTruthy();
      titulos.push(titulo!);
    }
    const indice = /<title>([^<]*)<\/title>/.exec(await (await request.get(RUTA)).text())?.[1]?.trim();
    expect(new Set([...titulos, indice]).size).toBe(PAGINAS.length + 1);
  });
});

test.describe('Funcionalidades — páginas', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  for (const p of PAGINAS) {
    test(`${p.slug}: 200, un H1, canonical, index, breadcrumb, pantallas, FAQ y JSON-LD`, async ({ page, baseURL }) => {
      const ruta = rutaDe(p.slug);
      const respuesta = await page.goto(ruta);
      expect(respuesta?.status()).toBe(200);
      expect(new URL(page.url()).pathname).toBe(ruta);
      expect(cadenaLocal(respuesta, baseURL!)).not.toContain('/sign-in');

      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1);

      await esperarIndexable(page, ruta);
      expect((await page.title()).trim()).toBeTruthy();

      // Breadcrumb: Inicio → Funcionalidades → la página actual (aria-current).
      const ruta_ = page.getByRole('navigation', { name: 'Ruta' });
      await expect(ruta_.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
      await expect(ruta_.getByRole('link', { name: 'Funcionalidades' })).toHaveAttribute('href', RUTA);
      await expect(ruta_.locator('[aria-current="page"]')).toHaveText(p.nombre);

      // Pantallas: hero + 2 bloques, decorativas y cada una con texto visible.
      const figuras = page.locator('main figure');
      expect(await figuras.count()).toBeGreaterThanOrEqual(3);
      for (const figura of await figuras.all()) {
        await expect(figura.locator(':scope > [aria-hidden="true"][inert]')).toHaveCount(1);
        await expect(figura.locator('figcaption')).not.toBeEmpty();
      }
      const claves = await page.locator('main figure [data-pantalla]').evaluateAll((els) =>
        els.map((e) => e.getAttribute('data-pantalla')),
      );
      expect(new Set(claves).size).toBe(claves.length);

      // Relacionadas: las otras 9, sin la actual.
      const relacionadas = page.getByRole('region', { name: 'Otras funcionalidades' });
      await expect(relacionadas.locator(`a[href^="${RUTA}/"]`)).toHaveCount(PAGINAS.length - 1);
      await expect(relacionadas.locator(`a[href="${ruta}"]`)).toHaveCount(0);

      // FAQ como <details> nativo: se abre con un click.
      const faqs = page.getByRole('region', { name: 'Lo que nos suelen preguntar' }).locator('details');
      expect(await faqs.count()).toBeGreaterThanOrEqual(4);
      const primera = faqs.first();
      await expect(primera).not.toHaveAttribute('open', '');
      await primera.locator('summary').click();
      await expect(primera).toHaveAttribute('open', '');
      await expect(primera.locator('p')).toBeVisible();

      const nodos = await nodosJsonLd(page);
      expect(tipos(nodos)).toEqual(expect.arrayContaining(['BreadcrumbList', 'FAQPage']));
      const migas = nodos.find((n) => n['@type'] === 'BreadcrumbList')!.itemListElement as { item: string }[];
      expect(migas).toHaveLength(3);
      expect(new URL(migas[2].item).pathname).toBe(ruta);
      const preguntas = nodos.find((n) => n['@type'] === 'FAQPage')!.mainEntity as unknown[];
      expect(preguntas).toHaveLength(await faqs.count());

      const niveles = await nivelesDeHeadings(page);
      expect(niveles[0]).toBe(1);
      for (let i = 1; i < niveles.length; i++) expect(niveles[i] - niveles[i - 1]).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('Funcionalidades — sin scroll horizontal', () => {
  for (const ancho of [375, 768, 1440]) {
    for (const ruta of [RUTA, ...PAGINAS.map((p) => rutaDe(p.slug))]) {
      test(`${ruta} a ${ancho}px`, async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: 900 });
        const r = await page.goto(ruta);
        expect(r?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await esperarSinScrollHorizontal(page);
      });
    }
  }
});

test.describe('Funcionalidades — navegación', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  for (const [dispositivo, viewport] of [
    ['mobile', { width: 375, height: 812 }],
    ['desktop', { width: 1440, height: 900 }],
  ] as const) {
    test(`happy path (${dispositivo}) — home → nav "Funcionalidades" → tarjeta → breadcrumb vuelve al índice`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');

      const enlaceNav = page.locator('header[data-morph-nav]').getByRole('link', { name: 'Funcionalidades', exact: true });
      await expect(enlaceNav).toBeVisible();
      await enlaceNav.click();
      await page.waitForURL(`**${RUTA}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Funcionalidades para gestionar tu club deportivo');

      const turnos = PAGINAS.find((p) => p.slug === 'turnos')!;
      await page
        .getByRole('region', { name: 'Todas las funcionalidades' })
        .getByRole('link', { name: new RegExp(`^${turnos.nombre}`) })
        .click();
      await page.waitForURL(`**${rutaDe(turnos.slug)}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(turnos.h1);

      await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Funcionalidades' }).click();
      await page.waitForURL(`**${RUTA}`);
      expect(new URL(page.url()).pathname).toBe(RUTA);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Funcionalidades para gestionar tu club deportivo');
    });
  }

  test('a 375px, "Funcionalidades" del nav entra sin montarse con el logo ni el CTA', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const ruta of ['/', RUTA]) {
      await page.goto(ruta);
      const header = page.locator('header[data-morph-nav]');
      const logo = (await header.getByRole('link', { name: 'BioTeam, inicio' }).boundingBox())!;
      const enlace = (await header.getByRole('link', { name: 'Funcionalidades', exact: true }).boundingBox())!;
      const cta = (await header.getByRole('link', { name: 'Ingresar' }).boundingBox())!;
      expect(logo.x + logo.width, ruta).toBeLessThanOrEqual(enlace.x);
      expect(enlace.x + enlace.width, ruta).toBeLessThanOrEqual(cta.x);
      expect(cta.x + cta.width, ruta).toBeLessThanOrEqual(375);
    }
  });

  test('home: las tarjetas de módulos y el footer enlazan a las funcionalidades', async ({ page }) => {
    await page.goto('/');

    // Una tarjeta de módulo (fuera del nav y del footer) lleva a su página.
    const tarjeta = page.locator(`main section a[href="${rutaDe('turnos')}"]`).first();
    await expect(tarjeta).toBeAttached();
    await expect(page.getByRole('link', { name: 'Ver todas las funcionalidades' })).toHaveAttribute('href', RUTA);

    const footer = page.locator('footer');
    const enFooter = await footer.locator(`a[href^="${RUTA}"]`).evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(new Set(enFooter)).toEqual(new Set([RUTA, ...PAGINAS.map((p) => rutaDe(p.slug))]));

    await tarjeta.scrollIntoViewIfNeeded();
    await tarjeta.click();
    await page.waitForURL(`**${rutaDe('turnos')}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGINAS.find((p) => p.slug === 'turnos')!.h1);
  });

  test('las rutas internas siguen protegidas', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/sign-in**');
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });
});
