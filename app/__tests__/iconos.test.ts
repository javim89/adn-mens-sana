// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APP = join(process.cwd(), 'app');
const PUBLIC = join(process.cwd(), 'public');

describe('íconos de la app', () => {
  it('app/ no tiene archivos de ícono: le ganarían a los íconos del club en (app)', () => {
    // Un `app/icon.*`, `app/apple-icon.*` o `app/favicon.ico` se declara en todas las
    // páginas por encima de `generateMetadata`, y los favicons por club se rompen en silencio.
    const iconos = readdirSync(APP).filter((f) => /^(icon|apple-icon)\d*\.|^favicon\.ico$/.test(f));
    expect(iconos).toEqual([]);
  });

  it.each(['brand/favicon.ico', 'brand/icon.svg', 'brand/apple-icon.png', 'brand/icono-neutro.svg'])(
    'public/%s existe',
    (archivo) => {
      expect(existsSync(join(PUBLIC, archivo))).toBe(true);
    },
  );
});
