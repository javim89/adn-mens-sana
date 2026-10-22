import { test, expect } from '@playwright/test';

/**
 * Landing pública en `/`.
 *
 * Antes `/` redirigía a `/dashboard` (y de ahí a `/sign-in` sin sesión). Ahora es
 * pública: `proxy.ts` exime el `"/"` exacto y el resto sigue protegido.
 */
test.describe('Landing pública', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('sin sesión, / responde 200 sin pasar por el login y muestra el titular', async ({ page }) => {
    const respuesta = await page.goto('/');
    expect(respuesta?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/');

    // Con una instancia de desarrollo de Clerk, el primer documento pasa por el
    // handshake de `*.clerk.accounts.dev` y vuelve a la misma URL (dev-browser-missing).
    // Eso no es un redirect de la app: lo que no puede aparecer en la cadena es el
    // guard de sesión mandando a /sign-in, ni el viejo `/` → `/dashboard`.
    const cadena: string[] = [];
    for (let r = respuesta?.request() ?? null; r; r = r.redirectedFrom()) cadena.push(r.url());
    const locales = cadena.map((u) => new URL(u)).filter((u) => u.hostname === 'localhost');
    expect(locales.map((u) => u.pathname)).not.toContain('/sign-in');
    expect(locales.map((u) => u.pathname)).not.toContain('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Todo tu club, en una sola pantalla' })).toBeVisible();
  });

  test('"Ingresar" lleva a /sign-in', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Ingresar' }).first().click();
    await page.waitForURL('**/sign-in**');
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  test('las rutas internas siguen protegidas', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/sign-in**');
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  test('las cards de producto no son enfocables', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('hero-cards');
    await expect(cards).toHaveAttribute('aria-hidden', 'true');
    await expect(cards).toHaveAttribute('inert', '');
  });

  for (const ancho of [375, 768, 1024, 1440]) {
    test(`sin scroll horizontal a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Recorre la página para disparar los reveals y las animaciones de entrada.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
});

/**
 * El morph del hero: al scrollear, las cards flotantes se arman en la ventana del
 * dashboard. Solo en desktop (xl, alto ≥ 640px) y sin reduced-motion.
 */
test.describe('Landing — scroll que arma el dashboard', () => {
  /**
   * Scrollea `vh` viewports dentro del pin. Los hitos (ver `TRAMOS` en MorphHero):
   * la etapa 1 termina en 0.91, la etapa 2 (scroll interno de la ventana) va de 1 a 2.
   */
  const aViewports = async (page: import('@playwright/test').Page, vh: number) => {
    await page.evaluate((vh) => {
      const r = document.querySelector<HTMLElement>('[data-testid=morph-hero]')!;
      const inicio = r.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, inicio + vh * window.innerHeight);
    }, vh);
    // El progreso pintado persigue al del scroll (scrub suave): darle tiempo a llegar.
    await page.waitForTimeout(1300);
  };

  /** `interior` está entero adentro de `exterior` (con 1px de tolerancia). */
  const adentro = (
    interior: { x: number; y: number; width: number; height: number },
    exterior: { x: number; y: number; width: number; height: number },
  ) =>
    interior.x >= exterior.x - 1 &&
    interior.y >= exterior.y - 1 &&
    interior.x + interior.width <= exterior.x + exterior.width + 1 &&
    interior.y + interior.height <= exterior.y + exterior.height + 1;

  // Regresión: con un gate de min-height 840px el morph no corría en una laptop de 1440×783.
  for (const [ancho, alto] of [
    [1440, 783],
    [1280, 720],
  ] as const) {
    test(`a ${ancho}×${alto} se arma el dashboard, scrollea hasta la segunda fila y vuelve`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto('/');
      const morph = page.getByTestId('morph-hero');
      await expect(morph).toHaveAttribute('data-morph', 'on');
      // Que terminen las entradas desde el borde (hasta ~2.1s): suman su propio `translate`.
      await page.waitForTimeout(2200);

      // Scroll 0: la ventana ya asoma, tenue, abajo del hero.
      const ventana = page.getByTestId('ventana-dashboard');
      await expect(ventana).toHaveCSS('opacity', '0.15');
      await expect(ventana).toBeInViewport({ ratio: 0.01 });

      await aViewports(page, 0.45);
      // A mitad de camino el escenario sigue fijo arriba.
      const escenarioTop = await page.evaluate(
        () => document.querySelector('[data-morph-escenario]')!.getBoundingClientRect().top,
      );
      expect(Math.abs(escenarioTop)).toBeLessThan(1);

      // Fin de la etapa 1: el dashboard armado, cada card del hero en su slot.
      await aViewports(page, 0.92);
      await expect(ventana).toHaveCSS('opacity', '1');
      await expect(ventana).toBeInViewport();
      await expect(page.getByRole('heading', { level: 1 })).toBeHidden();
      const caja = (await ventana.boundingBox())!;
      for (const id of ['triage', 'presentismo-kpi', 'presentismo-dia', 'turnos']) {
        const card = (await page.locator(`[data-morph-card="${id}"]`).boundingBox())!;
        expect(adentro(card, caja), id).toBe(true);
        const slot = (await page.locator(`[data-morph-slot="${id}"]`).boundingBox())!;
        expect(Math.abs(card.x - slot.x), id).toBeLessThan(2);
        expect(Math.abs(card.y - slot.y), id).toBeLessThan(2);
      }

      // Fin de la etapa 2: el contenido scrolleó adentro de la ventana y la segunda fila
      // (Seguimientos, Viandas, Plantel) se ve entera, con sus números ya contados.
      await aViewports(page, 2.1);
      const columna = (await page.locator('[data-morph-columna]').boundingBox())!;
      for (const ancla of ['seguimientos', 'viandas', 'plantel']) {
        const card = (await page.locator(`[data-morph-ancla="${ancla}"]`).boundingBox())!;
        expect(adentro(card, columna), ancla).toBe(true);
      }
      await expect(page.locator('[data-morph-ancla="seguimientos"] [data-kpi-valor]')).toHaveText('42');
      await expect(page.locator('[data-morph-ancla="plantel"] [data-kpi-valor]')).toHaveText('212');
      // El único cursor (Viandas) quedó visible sobre su card.
      const cursor = page.locator('[data-morph-cursor]');
      await expect(cursor).toHaveCSS('opacity', '1');
      const viandas = (await page.locator('[data-morph-ancla="viandas"]').boundingBox())!;
      expect(adentro((await cursor.boundingBox())!, viandas)).toBe(true);
      // Las cards que volaron se cambiaron por sus copias, que scrollean con la ventana.
      await expect(page.locator('[data-morph-card="triage"]')).toBeHidden();

      // Scrubbed en los dos sentidos: de vuelta al fin de la etapa 1, y al principio.
      await aViewports(page, 0.92);
      await expect(page.locator('[data-morph-card="triage"]')).toBeVisible();
      await expect(page.locator('[data-morph-ancla="plantel"] [data-kpi-valor]')).toHaveText('0');
      await aViewports(page, 0);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(ventana).toHaveCSS('opacity', '0.15');
    });
  }

  test('un CTA del hero que recibe foco con el morph avanzado vuelve al inicio del pin', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 783 });
    await page.goto('/');
    await expect(page.getByTestId('morph-hero')).toHaveAttribute('data-morph', 'on');
    await aViewports(page, 0.3);
    const cta = page.locator('[data-morph-texto] a', { hasText: 'Ingresar' });
    await cta.focus();
    await expect(cta).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(2);
    await expect(cta).toBeInViewport();
    await expect(page.locator('[data-morph-texto]')).toHaveCSS('opacity', '1');
  });

  test('a 375px no hay morph ni escenario fijo, ni scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByTestId('morph-hero')).toHaveAttribute('data-morph', 'off');
    const position = await page.evaluate(
      () => getComputedStyle(document.querySelector('[data-morph-escenario]')!).position,
    );
    expect(position).not.toBe('sticky');
    await expect(page.getByTestId('ventana-dashboard')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 600));
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('con reduced-motion se ve el dashboard estático debajo del hero', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByTestId('morph-hero')).toHaveAttribute('data-morph', 'off');
    const ventana = page.getByTestId('ventana-dashboard');
    await ventana.scrollIntoViewIfNeeded();
    await expect(ventana).toBeVisible();
    await expect(ventana).toHaveCSS('opacity', '1');
    // El hero sigue en su lugar, arriba de la ventana.
    const h1 = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
    const caja = (await ventana.boundingBox())!;
    expect(h1.y).toBeLessThan(caja.y);
    // Estática y sin recorte: las dos filas enteras, con los números finales.
    for (const ancla of ['seguimientos', 'viandas', 'plantel']) {
      const card = (await page.locator(`[data-morph-ancla="${ancla}"]`).boundingBox())!;
      expect(card.y + card.height, ancla).toBeLessThanOrEqual(caja.y + caja.height + 1);
    }
    await expect(page.locator('[data-morph-ancla="plantel"] [data-kpi-valor]')).toHaveText('212');
    await context.close();
  });
});
