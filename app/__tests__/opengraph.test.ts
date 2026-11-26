// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import sharp from 'sharp';

const RAIZ = process.cwd();
const APP = join(RAIZ, 'app');
const OG_IMAGEN = join(RAIZ, 'public', 'brand', 'og-image.png');

function archivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    return e.isDirectory() ? archivos(ruta) : [ruta];
  });
}

const relativos = () => archivos(APP).map((f) => relative(RAIZ, f).split(sep).join('/'));

describe('Open Graph de la app', () => {
  it('app/ no tiene opengraph-image.* ni twitter-image.*: se heredarían y pisarían la marca de cada club', () => {
    // Incluye los `.alt.txt` que acompañan a esas imágenes.
    const imagenes = relativos().filter((f) => /(^|\/)(opengraph|twitter)-image[^/]*$/.test(f));
    expect(imagenes).toEqual([]);
  });

  it('public/brand/og-image.png existe, mide 1200x630 y pesa menos de 300 KB', async () => {
    expect(existsSync(OG_IMAGEN)).toBe(true);
    const { width, height, format } = await sharp(OG_IMAGEN).metadata();
    expect({ width, height, format }).toEqual({ width: 1200, height: 630, format: 'png' });
    expect(statSync(OG_IMAGEN).size).toBeLessThan(300 * 1024);
  });

  it('solo la landing, las páginas de funcionalidades y el superadmin importan metadata-bioteam', () => {
    const importan = relativos()
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes('__tests__'))
      .filter((f) => readFileSync(join(RAIZ, f), 'utf8').includes('metadata-bioteam'));
    const permitido = (f: string) =>
      ['app/page.tsx', 'app/(superadmin)/layout.tsx'].includes(f) || f.startsWith('app/funcionalidades/');
    expect(importan.filter((f) => !permitido(f))).toEqual([]);
    expect(importan).toContain('app/page.tsx');
  });
});
