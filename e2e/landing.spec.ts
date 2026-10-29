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
      // Sin cursor sobre la card de Viandas.
      await expect(page.locator('[data-morph-cursor]')).toHaveCount(0);
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

/**
 * Sección de funcionalidades (`#funcionalidades`): reemplaza a las tres secciones de dos
 * columnas. En lg+ es un acordeón que auto-avanza cada 7s con barra de progreso y una demo
 * por feature a la derecha. En < lg es una lista estática (título, descripción y demo de cada
 * feature, sin acordeón ni auto-avance). Contrato de selectores en
 * `docs/feature/landing-features-acordeon/overview.md`.
 *
 * Ojo con la hidratación: el SSR llega con `data-modo="lista"` y las 4 demos con
 * `data-visible="true"` también en lg (el CSS esconde las que no son Insights). Por eso en
 * desktop siempre se espera `data-modo="acordeon"` antes de afirmar estado o de interactuar.
 */
test.describe('Landing — funcionalidades', () => {
  type Pagina = import('@playwright/test').Page;

  const FUNCIONALIDADES = [
    // Fragmentos de la descripción (copy de la ux-spec §1), para no atar el test al texto entero.
    { id: 'insights', titulo: 'Insights', descripcion: 'Tableros con gráficos y KPIs' },
    { id: 'seguimientos', titulo: 'Seguimientos', descripcion: 'registran cada seguimiento' },
    { id: 'convocatorias', titulo: 'Convocatorias', descripcion: 'Citá a los deportistas a cada partido' },
    { id: 'deportistas', titulo: 'Deportistas', descripcion: 'Una ficha integral' },
  ] as const;
  const IDS = FUNCIONALIDADES.map((f) => f.id);

  const raiz = (page: Pagina) => page.getByTestId('acordeon-funcionalidades');
  const boton = (page: Pagina, id: string) => page.locator(`#funcionalidad-${id}-boton`);
  const panel = (page: Pagina, id: string) => page.locator(`#funcionalidad-${id}-panel`);
  const demo = (page: Pagina, id: string) => page.locator(`[data-demo="${id}"]`);
  const barras = (page: Pagina) => page.locator('[data-testid^="progreso-"]');

  /** Centra la raíz en el viewport: el auto-avance se pausa si la raíz está fuera de pantalla. */
  const centrarRaiz = async (page: Pagina) => {
    await raiz(page).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  };

  /** Carga `/` en desktop y espera a que el acordeón hidrate (el SSR arranca en modo lista). */
  const abrirDesktop = async (page: Pagina) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByTestId('seccion-funcionalidades').scrollIntoViewIfNeeded();
    await expect(raiz(page)).toHaveAttribute('data-modo', 'acordeon');
  };

  /** Solo la demo `id` está visible (las otras con `visibility: hidden`, tras el crossfade). */
  const soloVisible = async (page: Pagina, id: string) => {
    await expect(demo(page, id)).toHaveAttribute('data-visible', 'true');
    await expect(demo(page, id)).toBeVisible();
    for (const otro of IDS.filter((x) => x !== id)) {
      await expect(demo(page, otro), otro).toHaveAttribute('data-visible', 'false');
      await expect(demo(page, otro), otro).toBeHidden();
    }
  };

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('happy path a 1440 — click en Convocatorias cambia el panel abierto y la demo', async ({ page }) => {
    await abrirDesktop(page);
    const r = raiz(page);

    await expect(page.getByRole('heading', { level: 2, name: 'Del dato a la decisión' })).toBeVisible();

    // Los 4 botones, visibles y en orden.
    const botones = r.locator('button[aria-controls^="funcionalidad-"]');
    await expect(botones).toHaveCount(4);
    await expect(botones).toHaveText(FUNCIONALIDADES.map((f) => f.titulo));
    for (const { id, titulo } of FUNCIONALIDADES) {
      await expect(page.getByRole('button', { name: titulo, exact: true })).toBeVisible();
      await expect(boton(page, id)).toHaveAttribute('aria-controls', `funcionalidad-${id}-panel`);
      await expect(panel(page, id)).toHaveAttribute('role', 'region');
      await expect(panel(page, id)).toHaveAttribute('aria-labelledby', `funcionalidad-${id}-boton`);
      // Los títulos estáticos de mobile no se ven en desktop.
      await expect(page.locator(`[data-funcionalidad-texto="${id}"] [data-titulo-movil]`)).toBeHidden();
    }

    // Estado inicial: Insights abierto, con su barra y su demo.
    await expect(r).toHaveAttribute('data-activa', 'insights');
    await expect(r).toHaveAttribute('data-autoavance', 'on');
    await expect(boton(page, 'insights')).toHaveAttribute('aria-expanded', 'true');
    for (const id of IDS.filter((x) => x !== 'insights')) {
      await expect(boton(page, id)).toHaveAttribute('aria-expanded', 'false');
      await expect(panel(page, id)).toBeHidden();
    }
    await expect(panel(page, 'insights')).toBeVisible();
    await expect(page.getByTestId('progreso-insights')).toBeVisible();
    await soloVisible(page, 'insights');

    // Click en Convocatorias.
    await page.getByRole('button', { name: 'Convocatorias', exact: true }).click();
    await expect(r).toHaveAttribute('data-activa', 'convocatorias');
    await expect(r).toHaveAttribute('data-autoavance', 'on');
    await expect(boton(page, 'convocatorias')).toHaveAttribute('aria-expanded', 'true');
    for (const id of IDS.filter((x) => x !== 'convocatorias')) {
      await expect(boton(page, id), id).toHaveAttribute('aria-expanded', 'false');
    }
    await expect(panel(page, 'convocatorias')).toBeVisible();
    await expect(panel(page, 'convocatorias')).toContainText('Citá a los deportistas a cada partido');
    await expect(panel(page, 'insights')).toBeHidden();
    await soloVisible(page, 'convocatorias');
  });

  // Regresión: antes un click cortaba el auto-avance para siempre (barra llena y quieta).
  test('a 1440, un click reinicia la barra en ese ítem y a los ~7s el auto-avance sigue solo', async ({ page }) => {
    await abrirDesktop(page);
    await centrarRaiz(page);
    const r = raiz(page);
    // Que la barra de Insights ya vaya por la mitad: el click tiene que reiniciarla en Seguimientos.
    await page.mouse.move(5, 5);
    await page.waitForTimeout(3000);
    await expect(r).toHaveAttribute('data-activa', 'insights');

    // El mouse queda encima del botón después del click: ni el hover ni el foco del click pausan.
    await page.getByRole('button', { name: 'Seguimientos', exact: true }).click();
    const desde = Date.now();
    await expect(r).toHaveAttribute('data-activa', 'seguimientos');
    await expect(r).toHaveAttribute('data-autoavance', 'on');
    await expect(r).toHaveAttribute('data-pausado', 'false');
    await expect(page.getByTestId('progreso-seguimientos')).toBeVisible();
    await expect(page.getByTestId('progreso-insights')).toHaveCount(0);
    const relleno = page.locator('[data-testid="progreso-seguimientos"] > *').first();
    await expect(relleno).toHaveCSS('animation-name', 'landing-progreso');

    // Arrancó de 0: a los 5s todavía no avanzó…
    await page.waitForTimeout(5000);
    await expect(r).toHaveAttribute('data-activa', 'seguimientos');
    // …y a los ~7s pasa sola a Convocatorias.
    await expect(r).toHaveAttribute('data-activa', 'convocatorias', { timeout: 5000 });
    expect(Date.now() - desde).toBeGreaterThanOrEqual(6500);
    await expect(r).toHaveAttribute('data-autoavance', 'on');
    await expect(page.getByTestId('progreso-convocatorias')).toBeVisible();
    await soloVisible(page, 'convocatorias');
  });

  test('teclado a 1440 — flechas, Home y End mueven el foco; Enter abre', async ({ page }) => {
    await abrirDesktop(page);
    await boton(page, 'insights').focus();
    await expect(boton(page, 'insights')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(boton(page, 'seguimientos')).toBeFocused();
    await page.keyboard.press('End');
    await expect(boton(page, 'deportistas')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(boton(page, 'insights')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(boton(page, 'deportistas')).toBeFocused();

    // Las flechas solo mueven el foco: no abren ni cortan el auto-avance (el foco lo pausa).
    const r = raiz(page);
    await expect(r).toHaveAttribute('data-activa', 'insights');
    await expect(r).toHaveAttribute('data-autoavance', 'on');
    await expect(r).toHaveAttribute('data-pausado', 'true');

    await page.keyboard.press('Enter');
    await expect(r).toHaveAttribute('data-activa', 'deportistas');
    await expect(r).toHaveAttribute('data-autoavance', 'on');
    await expect(page.getByTestId('progreso-deportistas')).toBeVisible();
    await expect(boton(page, 'deportistas')).toHaveAttribute('aria-expanded', 'true');
    await expect(boton(page, 'insights')).toHaveAttribute('aria-expanded', 'false');
    await expect(panel(page, 'deportistas')).toBeVisible();
    await soloVisible(page, 'deportistas');
  });

  test('auto-avance real a 1440 — sin interactuar pasa de Insights a Seguimientos en ~7s', async ({ page }) => {
    await abrirDesktop(page);
    await centrarRaiz(page);
    // El mouse lejos de la raíz (que arranca en x ≈ 120 por el max-w-[1200px]).
    await page.mouse.move(5, 5);

    const r = raiz(page);
    await expect(r).toHaveAttribute('data-activa', 'insights');
    await expect(r).toHaveAttribute('data-pausado', 'false');
    await expect(page.getByTestId('progreso-insights')).toBeVisible();

    await expect(r).toHaveAttribute('data-activa', 'seguimientos', { timeout: 10_000 });
    // Avanzó solo: el auto-avance sigue encendido y la barra pasó al nuevo activo.
    await expect(r).toHaveAttribute('data-autoavance', 'on');
    await expect(boton(page, 'seguimientos')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('progreso-seguimientos')).toBeVisible();
    await soloVisible(page, 'seguimientos');
  });

  test('a 1440, con el mouse sobre el acordeón el auto-avance NO se pausa', async ({ page }) => {
    await abrirDesktop(page);
    await centrarRaiz(page);
    // Hover sobre un título (sin click) durante 8s: igual que steep, el hover no pausa.
    await boton(page, 'convocatorias').hover();

    const r = raiz(page);
    await expect(r).toHaveAttribute('data-pausado', 'false');
    await page.waitForTimeout(8000);
    await expect(r).toHaveAttribute('data-activa', 'seguimientos');
    await expect(r).toHaveAttribute('data-autoavance', 'on');
    await soloVisible(page, 'seguimientos');
  });

  test('con reduced-motion no hay auto-avance ni barra, y el click sigue funcionando', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.getByTestId('seccion-funcionalidades').scrollIntoViewIfNeeded();
    const r = raiz(page);
    await expect(r).toHaveAttribute('data-modo', 'acordeon');
    await expect(r).toHaveAttribute('data-autoavance', 'off');
    await expect(barras(page)).toHaveCount(0);

    await centrarRaiz(page);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(8000);
    await expect(r).toHaveAttribute('data-activa', 'insights');
    await soloVisible(page, 'insights');

    await page.getByRole('button', { name: 'Convocatorias', exact: true }).click();
    await expect(r).toHaveAttribute('data-activa', 'convocatorias');
    await expect(boton(page, 'convocatorias')).toHaveAttribute('aria-expanded', 'true');
    await expect(barras(page)).toHaveCount(0);
    await soloVisible(page, 'convocatorias');
    await context.close();
  });

  test('sin JS a 1440 (antes de hidratar) solo se ve la demo de Insights', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('/');
    const r = raiz(page);
    // El SSR llega en modo lista con las 4 demos marcadas visibles; el CSS de lg muestra solo Insights.
    await expect(r).toHaveAttribute('data-modo', 'lista');
    for (const id of IDS) await expect(demo(page, id), id).toHaveAttribute('data-visible', 'true');
    await expect(demo(page, 'insights')).toBeVisible();
    for (const id of IDS.filter((x) => x !== 'insights')) await expect(demo(page, id), id).toBeHidden();
    await context.close();
  });

  test('mobile 375 — lista estática: 4 features con título, descripción y demo, sin acordeón', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByTestId('seccion-funcionalidades').scrollIntoViewIfNeeded();
    const r = raiz(page);
    await expect(r).toHaveAttribute('data-modo', 'lista');
    await expect(r).toHaveAttribute('data-autoavance', 'off');
    await expect(barras(page).filter({ visible: true })).toHaveCount(0);

    // Sin botones de acordeón: los títulos son los spans estáticos.
    await expect(
      page.locator('#funcionalidades button[aria-controls^="funcionalidad-"]').filter({ visible: true }),
    ).toHaveCount(0);
    const titulos = r.locator('[data-titulo-movil]');
    await expect(titulos).toHaveCount(4);
    await expect(titulos).toHaveText(FUNCIONALIDADES.map((f) => f.titulo));
    for (let i = 0; i < 4; i++) await expect(titulos.nth(i)).toBeVisible();

    // Las 4 features visibles, con su descripción y su demo (cada demo montada una sola vez).
    await expect(page.locator('[data-demo]')).toHaveCount(4);
    for (const { id, descripcion } of FUNCIONALIDADES) {
      await expect(panel(page, id), id).toBeVisible();
      await expect(panel(page, id), id).toContainText(descripcion);
      await expect(demo(page, id), id).toHaveAttribute('data-visible', 'true');
      await expect(demo(page, id), id).toBeVisible();
      await expect(demo(page, id), id).toHaveAttribute('aria-hidden', 'true');
      await expect(demo(page, id), id).toHaveAttribute('inert', '');
    }

    // Orden vertical: texto(insights) < demo(insights) < texto(seguimientos) < … < demo(deportistas).
    const ys: { nombre: string; y: number }[] = [];
    for (const id of IDS) {
      const texto = (await page.locator(`[data-funcionalidad-texto="${id}"]`).boundingBox())!;
      const caja = (await demo(page, id).boundingBox())!;
      ys.push({ nombre: `texto ${id}`, y: texto.y }, { nombre: `demo ${id}`, y: caja.y });
      // El texto termina antes de que empiece su demo.
      expect(texto.y + texto.height, id).toBeLessThanOrEqual(caja.y + 1);
      // La demo entra en el ancho del viewport.
      expect(caja.x, id).toBeGreaterThanOrEqual(0);
      expect(caja.x + caja.width, id).toBeLessThanOrEqual(375);
    }
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i].y, `${ys[i - 1].nombre} antes que ${ys[i].nombre}`).toBeGreaterThan(ys[i - 1].y);
    }

    // Sin scroll horizontal con la página recorrida hasta el final.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Sin auto-avance: 8s después nada cambió.
    await centrarRaiz(page);
    const estado = () =>
      r.evaluate((el) => ({
        modo: el.getAttribute('data-modo'),
        activa: el.getAttribute('data-activa'),
        autoavance: el.getAttribute('data-autoavance'),
        visibles: Array.from(el.querySelectorAll('[data-demo]')).map((d) => d.getAttribute('data-visible')),
      }));
    const antes = await estado();
    await page.waitForTimeout(8000);
    expect(await estado()).toEqual(antes);
    expect(antes.visibles).toEqual(['true', 'true', 'true', 'true']);
    await expect(barras(page).filter({ visible: true })).toHaveCount(0);
  });

  test('cambio de breakpoint — de 1440 a 375 pasa a lista, y de vuelta a acordeón', async ({ page }) => {
    await abrirDesktop(page);
    const r = raiz(page);
    await soloVisible(page, 'insights');

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(r).toHaveAttribute('data-modo', 'lista');
    await expect(r).toHaveAttribute('data-autoavance', 'off');
    for (const id of IDS) {
      await expect(demo(page, id), id).toHaveAttribute('data-visible', 'true');
      await expect(demo(page, id), id).toBeVisible();
    }
    await expect(barras(page).filter({ visible: true })).toHaveCount(0);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(r).toHaveAttribute('data-modo', 'acordeon');
    await expect(page.locator('[data-demo][data-visible="true"]')).toHaveCount(1);
    const activa = (await r.getAttribute('data-activa'))!;
    expect(IDS as readonly string[]).toContain(activa);
    await soloVisible(page, activa);
    await expect(boton(page, activa)).toHaveAttribute('aria-expanded', 'true');
  });

  for (const [ancho, alto] of [
    [1440, 900],
    [375, 812],
  ] as const) {
    test(`a ${ancho}px el pill del hero lleva a #funcionalidades`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto('/');
      const pill = page.getByRole('link', { name: /Tableros de Insights/ });
      await expect(pill).toHaveAttribute('href', '#funcionalidades');
      // El ancla vieja desapareció.
      await expect(page.locator('#insights')).toHaveCount(0);

      await pill.click();
      await expect(page).toHaveURL(/#funcionalidades$/);
      await expect(page.getByTestId('seccion-funcionalidades')).toBeInViewport();
    });
  }

  test('las tres secciones viejas ya no están', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('seccion-funcionalidades')).toBeAttached();
    for (const titular of [
      'Detectá a tiempo quién necesita apoyo',
      'Todas las miradas sobre el mismo deportista',
      'Tableros sobre los datos de tu club',
    ]) {
      await expect(page.getByRole('heading', { name: titular }), titular).toHaveCount(0);
    }
  });
});

/**
 * Regresión: en lg+ las demos de funcionalidades se veían cortadas contra el borde, con
 * el contenido principal truncado y los overlays tapando el dato central.
 *
 * Ahora (como steep.app) cada demo es una ventana completa que ocupa el resto de la fila,
 * sin sangrado, y adentro la app entera en un lienzo de 1280×832 escalado al ancho de la
 * ventana (`EscenarioDemo`). Se valida que la ventana entra en el viewport, que el lienzo
 * escalado entra entero en la ventana y que el dato principal (`data-demo-clave`) y los
 * overlays (`data-demo-overlay`) se ven enteros, sin elipsis y sin pisarse.
 *
 * Con reduced-motion: sin crossfade ni animación de entrada de los popovers, así las cajas
 * no se mueven mientras se miden.
 */
test.describe('Landing — demos de desktop encuadradas', () => {
  test.use({ reducedMotion: 'reduce' });

  const IDS = ['insights', 'seguimientos', 'convocatorias', 'deportistas'] as const;

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  for (const [ancho, alto] of [
    [1024, 900],
    [1280, 900],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    for (const id of IDS) {
      test(`a ${ancho}px la demo ${id} es una ventana completa con el dato principal entero y los overlays sin taparlo`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: ancho, height: alto });
        await page.goto('/');
        await page.locator('#funcionalidades').scrollIntoViewIfNeeded();
        await expect(page.getByTestId('acordeon-funcionalidades')).toHaveAttribute('data-modo', 'acordeon');
        await page.mouse.move(0, 0);
        await page.locator(`#funcionalidad-${id}-boton`).click();

        const ventana = page.locator(`[data-demo="${id}"][data-visible="true"]`);
        await expect(ventana).toBeVisible();
        await ventana.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await page.mouse.move(0, 0);
        await page.waitForTimeout(400);

        const medicion = await ventana.evaluate((el) => {
          type Caja = { left: number; top: number; right: number; bottom: number };
          const caja = (n: Element): Caja => {
            const r = n.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
          };
          const nombre = (n: HTMLElement) => n.dataset.demoClave ?? n.dataset.demoOverlay ?? '';
          const medir = (selector: string) =>
            Array.from(el.querySelectorAll<HTMLElement>(selector))
              .filter((n) => n.getClientRects().length > 0)
              .map((n) => ({ nombre: nombre(n), caja: caja(n) }));

          const recortados: string[] = [];
          for (const clave of el.querySelectorAll<HTMLElement>('[data-demo-clave]')) {
            for (const n of [clave, ...clave.querySelectorAll<HTMLElement>('*')]) {
              if (n.getClientRects().length === 0) continue;
              const estilo = getComputedStyle(n);
              const recorta = estilo.overflowX !== 'visible' || estilo.textOverflow === 'ellipsis';
              if (recorta && n.scrollWidth > n.clientWidth + 1) {
                recortados.push(`${nombre(clave)}: "${n.textContent?.trim()}" (${n.scrollWidth} > ${n.clientWidth})`);
              }
            }
          }

          const lienzo = el.querySelector<HTMLElement>('[data-demo-lienzo]')!;
          return {
            viewport: { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight },
            ventana: caja(el),
            lienzo: caja(lienzo),
            claves: medir('[data-demo-clave]'),
            overlays: medir('[data-demo-overlay]'),
            recortados,
            escala: Number(lienzo.dataset.escala),
          };
        });

        const { viewport, ventana: v, lienzo, claves, overlays, recortados, escala } = medicion;
        const TOL = 1;
        const dentro = (
          interior: { left: number; top: number; right: number; bottom: number },
          exterior: typeof interior,
          msg: string,
        ) => {
          expect(interior.left, msg).toBeGreaterThanOrEqual(exterior.left - TOL);
          expect(interior.top, msg).toBeGreaterThanOrEqual(exterior.top - TOL);
          expect(interior.right, msg).toBeLessThanOrEqual(exterior.right + TOL);
          expect(interior.bottom, msg).toBeLessThanOrEqual(exterior.bottom + TOL);
        };

        // La ventana entera dentro del viewport (sin sangrado) y el lienzo entero dentro de la ventana.
        dentro(v, viewport, JSON.stringify({ ancho, id, que: 'ventana', v, viewport }));
        dentro(lienzo, v, JSON.stringify({ ancho, id, que: 'lienzo', lienzo, v }));
        // Y el lienzo la llena: no queda una franja vacía abajo ni a la derecha.
        expect(v.right - lienzo.right, `${ancho} ${id}: lienzo llena el ancho`).toBeLessThanOrEqual(2);
        expect(v.bottom - lienzo.bottom, `${ancho} ${id}: lienzo llena el alto`).toBeLessThanOrEqual(2);

        expect(claves.length, `${ancho} ${id}: hay claves`).toBeGreaterThan(0);
        expect(overlays.length, `${ancho} ${id}: hay overlay`).toBeGreaterThan(0);
        for (const { nombre, caja } of [...claves, ...overlays]) {
          dentro(caja, v, JSON.stringify({ ancho, id, clave: nombre, caja, v }));
        }

        expect(recortados, JSON.stringify({ ancho, id })).toEqual([]);

        for (const o of overlays) {
          for (const c of claves) {
            const solapeX = Math.min(o.caja.right, c.caja.right) - Math.max(o.caja.left, c.caja.left);
            const solapeY = Math.min(o.caja.bottom, c.caja.bottom) - Math.max(o.caja.top, c.caja.top);
            const pisa = solapeX > TOL && solapeY > TOL;
            expect(pisa, JSON.stringify({ ancho, id, overlay: o.nombre, clave: c.nombre })).toBe(false);
          }
        }

        // Escala de "captura": la app entera reducida, como steep (~0.5–0.65).
        expect(escala, `${ancho} ${id}: escala`).toBeGreaterThanOrEqual(0.45);
        expect(escala, `${ancho} ${id}: escala`).toBeLessThanOrEqual(0.75);
      });
    }
  }

  test('a 375px los lienzos no se escalan', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByTestId('seccion-funcionalidades').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('acordeon-funcionalidades')).toHaveAttribute('data-modo', 'lista');
    const lienzos = page.locator('[data-demo-lienzo]');
    await expect(lienzos).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(lienzos.nth(i)).not.toHaveAttribute('data-escala');
      await expect(lienzos.nth(i)).toHaveCSS('transform', 'none');
    }
  });
});
