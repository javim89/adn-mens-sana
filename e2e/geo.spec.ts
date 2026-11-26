import { test, expect, type Page, type Response } from '@playwright/test';
import { AGENTES_IA } from '../lib/seo/agentes-ia';

/**
 * GEO (Generative Engine Optimization): lo que leen los buscadores con IA, sin sesión.
 *
 * - `/llms.txt` y `/llms-full.txt`: públicos, `text/plain`, arrancan con `# BioTeam` y
 *   enlazan cada funcionalidad con URL absoluta (nunca relativa).
 * - `robots.txt`: un grupo por cada agente de `AGENTES_IA` además del `*`, y el Sitemap.
 * - Home: bloque "¿Qué es BioTeam?" en el HTML del servidor; JSON-LD con WebSite;
 *   `<html lang="es-AR">`.
 * - Página de funcionalidad: bloque "En pocas palabras" con su resumen-respuesta.
 *
 * `urlDelSitio()` sale de `NEXT_PUBLIC_APP_URL`, que cambia entre entornos: las URLs se
 * validan como absolutas y se comparan por pathname.
 */

const SLUG_CLUB = 'gimnasia-la-plata';

const SLUGS = [
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
] as const;

const RUTAS_LLMS = ['/llms.txt', '/llms-full.txt'] as const;

/** Pathnames locales de la cadena de redirects (ignora el handshake de Clerk dev). */
function cadenaLocal(respuesta: Response | null, baseURL: string): string[] {
  const host = new URL(baseURL).host;
  const urls: string[] = [];
  for (let r = respuesta?.request() ?? null; r; r = r.redirectedFrom()) urls.push(r.url());
  return urls.map((u) => new URL(u)).filter((u) => u.host === host).map((u) => u.pathname);
}

type NodoLd = Record<string, unknown>;

/** Los nodos del (único) `@graph` de la página. */
async function grafoJsonLd(page: Page): Promise<NodoLd[]> {
  const textos = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(textos).toHaveLength(1);
  const valor = JSON.parse(textos[0]) as NodoLd;
  expect(valor['@context']).toBe('https://schema.org');
  expect(Array.isArray(valor['@graph'])).toBe(true);
  return valor['@graph'] as NodoLd[];
}

/** Todos los `{"@id": …}` usados como referencia (objetos con solo `@id`). */
function referencias(valor: unknown, acc: string[] = []): string[] {
  if (Array.isArray(valor)) for (const v of valor) referencias(v, acc);
  else if (valor && typeof valor === 'object') {
    const obj = valor as Record<string, unknown>;
    const claves = Object.keys(obj);
    if (claves.length === 1 && claves[0] === '@id') acc.push(String(obj['@id']));
    else for (const v of Object.values(obj)) referencias(v, acc);
  }
  return acc;
}

test.describe('GEO — llms.txt', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  for (const ruta of RUTAS_LLMS) {
    test(`happy path — ${ruta} responde 200 sin sesión, text/plain, con # BioTeam y URLs absolutas`, async ({ request, page, baseURL }) => {
      const r = await request.get(ruta, { maxRedirects: 0 });
      expect(r.status()).toBe(200);
      expect(r.headers()['content-type']).toBe('text/plain; charset=utf-8');

      const texto = await r.text();
      expect(texto.startsWith('# BioTeam')).toBe(true);

      // Cada funcionalidad aparece con URL absoluta.
      const urls = [...texto.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => new URL(m[0]));
      const paths = new Set(urls.map((u) => u.pathname));
      for (const slug of SLUGS) expect(paths, slug).toContain(`/funcionalidades/${slug}`);

      // Ningún link Markdown relativo ni nombre de club cliente.
      expect(texto).not.toMatch(/\]\(\//);
      expect(texto).not.toMatch(/^URL: \//m);
      expect(texto).not.toMatch(/\b(gimnasia|esgrima|la plata)\b/i);

      // Como documento (con el handshake de Clerk dev de por medio) tampoco va al login.
      const doc = await page.goto(ruta);
      expect(doc?.status()).toBe(200);
      expect(cadenaLocal(doc, baseURL!)).not.toContain('/sign-in');
    });
  }

  test('llms.txt enlaza a la versión completa; llms-full.txt trae las preguntas frecuentes', async ({ request }) => {
    const corto = await (await request.get('/llms.txt')).text();
    expect(corto).toMatch(/\]\(https?:\/\/[^)]+\/llms-full\.txt\)/);
    const completo = await (await request.get('/llms-full.txt')).text();
    expect(completo).toContain('En pocas palabras:');
    expect(completo).toContain('### Preguntas frecuentes');
    expect(completo.length).toBeGreaterThan(corto.length);
  });

  test('edge case — subdominio del club: llms.txt va con 308 al dominio raíz', async ({ request }) => {
    const dominio = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    test.skip(!dominio, 'Sin NEXT_PUBLIC_ROOT_DOMAIN en el entorno de test (el servicio e2e de Docker lo deja vacío)');
    const protocolo = dominio!.startsWith('localhost') ? 'http' : 'https';
    for (const ruta of RUTAS_LLMS) {
      const r = await request.get(`${protocolo}://${SLUG_CLUB}.${dominio}${ruta}`, { maxRedirects: 0 });
      expect(r.status(), ruta).toBe(308);
      expect(r.headers()['location'], ruta).toBe(`${protocolo}://${dominio}${ruta}`);
    }
  });
});

test.describe('GEO — robots.txt', () => {
  test('lista cada agente de IA, el * y el Sitemap, sin bloquear más que /api/', async ({ request }) => {
    const r = await request.get('/robots.txt', { maxRedirects: 0 });
    expect(r.status()).toBe(200);
    const texto = await r.text();

    const agentes = [...texto.matchAll(/^User-Agent:\s*(.+)$/gim)].map((m) => m[1].trim());
    expect(agentes).toContain('*');
    for (const agente of AGENTES_IA) expect(agentes, agente).toContain(agente);
    expect(agentes).toHaveLength(AGENTES_IA.length + 1);

    const disallows = [...texto.matchAll(/^Disallow:\s*(.*)$/gim)].map((m) => m[1].trim());
    expect(new Set(disallows)).toEqual(new Set(['/api/']));
    expect(texto).toMatch(/Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/);
  });
});

test.describe('GEO — contenido answer-first', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('happy path — la home muestra "¿Qué es BioTeam?" con su texto', async ({ page }) => {
    await page.goto('/');
    const seccion = page.getByTestId('seccion-que-es');
    await expect(seccion).toBeVisible();
    await expect(seccion.getByRole('heading', { level: 2, name: '¿Qué es BioTeam?' })).toBeVisible();
    await expect(seccion).toContainText('BioTeam es un software web de gestión integral del deportista');
    await expect(seccion.getByRole('heading', { level: 3, name: 'Para quién es' })).toBeVisible();
    await expect(seccion.getByRole('listitem')).not.toHaveCount(0);
    // aria-labelledby apunta al h2.
    await expect(page.getByRole('region', { name: '¿Qué es BioTeam?' })).toBeVisible();
  });

  test('el bloque "¿Qué es BioTeam?" está en el HTML del servidor (sin JS)', async ({ browser, baseURL }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await contexto.newPage();
    await page.goto('/');
    await expect(page.getByTestId('seccion-que-es')).toContainText('BioTeam es un software web');
    await contexto.close();
  });

  test('home: <html lang="es-AR"> y un solo @graph con WebSite, Organization y SoftwareApplication enlazados', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-AR');

    const grafo = await grafoJsonLd(page);
    const tipos = grafo.map((n) => n['@type']);
    for (const tipo of ['WebSite', 'Organization', 'SoftwareApplication', 'WebPage']) expect(tipos).toContain(tipo);

    const ids = new Set(grafo.map((n) => n['@id']).filter(Boolean));
    for (const ref of referencias(grafo)) expect(ids, ref).toContain(ref);

    const crudo = JSON.stringify(grafo);
    expect(crudo).not.toMatch(/"(offers|aggregateRating|review|price)"/);

    const software = grafo.find((n) => n['@type'] === 'SoftwareApplication')!;
    expect(software.featureList).toHaveLength(SLUGS.length);
  });

  test('happy path — una página de funcionalidad muestra "En pocas palabras" con su resumen', async ({ page }) => {
    await page.goto('/funcionalidades/triage-deportivo');
    const resumen = page.getByTestId('resumen-funcionalidad');
    await expect(resumen).toBeVisible();
    await expect(resumen.getByRole('heading', { level: 2, name: 'En pocas palabras' })).toBeVisible();

    // El texto es el mismo que la WebPage del JSON-LD usa como description.
    const grafo = await grafoJsonLd(page);
    const webPage = grafo.find((n) => n['@type'] === 'WebPage')!;
    const descripcion = String(webPage.description);
    expect(descripcion.length).toBeGreaterThan(100);
    await expect(resumen.locator('p')).toHaveText(descripcion);
    expect(descripcion).toMatch(/BioTeam/);
    expect(webPage.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const ids = new Set(grafo.map((n) => n['@id']).filter(Boolean));
    // Las referencias de la página resuelven en su grafo o en los ids estables de la home.
    for (const ref of referencias(grafo)) expect(ids.has(ref) || /\/#(website|software|organization)$/.test(ref), ref).toBe(true);
  });

  test('mobile 375 — los bloques se ven sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const [ruta, id] of [
      ['/', 'seccion-que-es'],
      ['/funcionalidades/turnos', 'resumen-funcionalidad'],
    ] as const) {
      await page.goto(ruta);
      const bloque = page.getByTestId(id);
      await bloque.scrollIntoViewIfNeeded();
      await expect(bloque).toBeVisible();
      const caja = await bloque.boundingBox();
      expect(caja!.width, ruta).toBeLessThanOrEqual(375);
      const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(desborde, ruta).toBeLessThanOrEqual(0);
    }
  });
});
