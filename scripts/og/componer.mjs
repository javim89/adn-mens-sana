// Compone la imagen híbrida: fondo (IA o CSS) + logo SVG real + titular + captura.
// Uso: node scripts/og/componer.mjs [--layout centrado|tres-cuartos|ambos] [--fondo a.png,b.png]
//      [--inclinada] [--sin-bajada] [--ancho-ventana 880]
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { ALTO, ANCHO, PALETA, parsearArgs } from './lib.mjs';

const DIR = import.meta.dirname;
const RAIZ = path.resolve(DIR, '../..');
const OUT = path.join(DIR, 'out');
const args = parsearArgs(process.argv.slice(2));

const TITULARES = {
  centrado: 'Todo tu club,<br>en una sola pantalla',
  'tres-cuartos': 'Todo tu club,<br>en una sola<br>pantalla',
};
const BAJADAS = {
  centrado: 'La gestión integral del deportista.',
  'tres-cuartos': 'La gestión integral<br>del deportista.',
};

const layouts = !args.layout || args.layout === 'ambos' ? ['centrado', 'tres-cuartos'] : [args.layout];
for (const l of layouts) if (!TITULARES[l]) throw new Error(`Layout desconocido: ${l}`);
const fondos = typeof args.fondo === 'string' ? args.fondo.split(',').map((f) => path.resolve(f)) : [null];

const aDataUrl = (archivo, mime) => `data:${mime};base64,${readFileSync(archivo).toString('base64')}`;
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const paletaCss = Object.entries(PALETA).map(([k, v]) => `--${kebab(k)}: ${v};`).join(' ');

const plantilla = readFileSync(path.join(DIR, 'plantilla.html'), 'utf8');
const logo = readFileSync(path.join(RAIZ, 'public/brand/bioteam-logo-inverso.svg'), 'utf8').replace(/<\?xml[^>]*>/, '');
const dashboard = aDataUrl(path.join(OUT, 'dashboard@2x.png'), 'image/png');

function html(layout, fondo) {
  const clases = [layout, args.inclinada && layout === 'centrado' ? 'inclinada' : '', args['sin-bajada'] ? 'sin-bajada' : '']
    .filter(Boolean)
    .join(' ');
  const estilos = args['ancho-ventana'] ? `--ancho-ventana: ${Number(args['ancho-ventana'])}px;` : '';
  return plantilla
    .replace('__PALETA__', `${paletaCss} ${estilos}`)
    .replace('__CLASES__', clases)
    .replace('__CLASE_FONDO__', fondo ? '' : 'sin-ia')
    .replace('__ESTILO_FONDO__', fondo ? `background-image: url('${aDataUrl(fondo, 'image/png')}')` : '')
    .replace('__DASHBOARD__', dashboard)
    .replace('__LOGO__', logo)
    .replace('__TITULAR__', TITULARES[layout])
    .replace('__BAJADA__', args['sin-bajada'] ? '' : `<p class="bajada">${BAJADAS[layout]}</p>`);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 2 });
  for (const fondo of fondos) {
    for (const layout of layouts) {
      await page.setContent(html(layout, fondo), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      if (layout === 'centrado') {
        // Ancho máximo del titular: 600 px; si no entra, 60 px (nunca menos).
        const ancho = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          const r = document.createRange();
          r.selectNodeContents(h1);
          return Math.max(...[...r.getClientRects()].map((c) => c.width));
        });
        if (ancho > 600) await page.evaluate(() => document.body.style.setProperty('--titular', '60px'));
      }
      const png = await page.screenshot({ type: 'png' });
      const sufijo = fondo ? path.basename(fondo, '.png').replace(/^fondo-(centrado|tres-cuartos)-/, '') : 'css';
      const variantes = `${args.inclinada && layout === 'centrado' ? '-inclinada' : ''}${args['sin-bajada'] ? '-sin-bajada' : ''}`;
      const nombre = `hibrido-${layout}${variantes}-${sufijo}.png`;
      const salida = path.join(OUT, nombre);
      const info = await sharp(png).resize(ANCHO, ALTO, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(salida);
      console.log(`OK ${salida} (${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB)`);
    }
  }
} finally {
  await browser.close();
}
