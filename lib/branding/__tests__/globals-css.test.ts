import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TEMA_BIOTEAM, VARS_TEMA, type Tema } from '../tokens';

const css = readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8');

const INICIO_TOKENS = '/* tokens:start';
const FIN_TOKENS = '/* tokens:end */';

function bloqueTokens(): string {
  const a = css.indexOf(INICIO_TOKENS);
  const b = css.indexOf(FIN_TOKENS);
  expect(a, 'falta el marcador tokens:start').toBeGreaterThanOrEqual(0);
  expect(b, 'falta el marcador tokens:end').toBeGreaterThan(a);
  return css.slice(a, b);
}

/** `--nombre: valor;` del bloque de tokens. */
function varsDelBloque(): Map<string, string> {
  const vars = new Map<string, string>();
  for (const m of bloqueTokens().matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    vars.set(m[1], m[2].trim());
  }
  return vars;
}

describe('app/globals.css — bloque de tokens', () => {
  test('hay un solo bloque de tokens', () => {
    expect(css.split(INICIO_TOKENS)).toHaveLength(2);
    expect(css.split(FIN_TOKENS)).toHaveLength(2);
  });

  test('los defaults --club-* son exactamente TEMA_BIOTEAM', () => {
    const vars = varsDelBloque();
    for (const [clave, nombre] of Object.entries(VARS_TEMA)) {
      expect(vars.get(nombre), nombre).toBe(TEMA_BIOTEAM[clave as keyof Tema]);
    }
  });

  test('no hay --club-* de más (cada uno es un color del tema)', () => {
    const delTema = new Set<string>(Object.values(VARS_TEMA));
    const club = [...varsDelBloque().keys()].filter((v) => v.startsWith('--club-'));
    expect(club.filter((v) => !delTema.has(v))).toEqual([]);
  });

  test('los fijos de BioTeam (superadmin) son la paleta BioTeam', () => {
    const vars = varsDelBloque();
    expect(vars.get('--bioteam-navy')).toBe(TEMA_BIOTEAM.primario);
    expect(vars.get('--bioteam-navy-hover')).toBe(TEMA_BIOTEAM.primarioHover);
    expect(vars.get('--bioteam-dorado')).toBe(TEMA_BIOTEAM.acento);
  });
});

describe('app/globals.css — @theme inline', () => {
  const theme = css.slice(css.indexOf('@theme inline'), css.indexOf('}', css.indexOf('@theme inline')));

  test('cada --color-* apunta a una var hoja del bloque de tokens', () => {
    const hojas = varsDelBloque();
    const colores = [...theme.matchAll(/(--color-[a-z0-9-]+)\s*:\s*([^;]+);/g)];
    expect(colores.length).toBeGreaterThan(10);
    for (const [, nombre, valor] of colores) {
      const ref = /^var\((--[a-z0-9-]+)\)$/.exec(valor.trim());
      expect(ref, `${nombre} debe ser var(--hoja)`).not.toBeNull();
      expect(hojas.has(ref![1]), `${nombre} → ${ref![1]} no está en el bloque de tokens`).toBe(true);
    }
  });

  test('los alias shadcn: primary/ring/accent son del club y secondary es gris', () => {
    expect(theme).toContain('--color-primary: var(--club-primario);');
    expect(theme).toContain('--color-ring: var(--club-secundario);');
    expect(theme).toContain('--color-accent: var(--club-secundario);');
    expect(theme).toContain('--color-secondary: var(--muted);');
  });
});
