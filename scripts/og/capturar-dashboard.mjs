// Captura la ventana del dashboard de la landing (datos demo) a 2x, con fondo transparente.
// Uso: node scripts/og/capturar-dashboard.mjs [--url https://bioteam.local]
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { parsearArgs } from './lib.mjs';

const OUT = path.resolve(import.meta.dirname, 'out');
const args = parsearArgs(process.argv.slice(2));
const base = args.url ?? process.env.PLAYWRIGHT_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://bioteam.local';
const salida = path.join(OUT, 'dashboard@2x.png');

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  console.log(`Abriendo ${base}/`);
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const ventana = page.getByTestId('ventana-dashboard');
  await ventana.waitFor({ state: 'visible' });
  await ventana.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);

  // Fondo transparente fuera de la ventana: sin el papel de la landing detrás de las
  // esquinas redondeadas y sin la sombra propia (la pone la plantilla).
  await ventana.evaluate((el) => {
    for (let n = el.parentElement; n; n = n.parentElement) n.style.background = 'transparent';
    el.style.boxShadow = 'none';
  });
  // Con reduced-motion los `Reveal` arrancan visibles; el margen es para los fonts e imágenes.
  await page.waitForTimeout(500);

  await ventana.screenshot({ path: salida, omitBackground: true, animations: 'disabled' });
  const caja = await ventana.boundingBox();
  console.log(`OK ${salida} (${Math.round(caja.width)}x${Math.round(caja.height)} css px, a 2x)`);
} finally {
  await browser.close();
}
