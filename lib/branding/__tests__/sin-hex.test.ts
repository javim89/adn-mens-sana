import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Guard: fuera de la landing y de `lib/branding/tokens.ts` no puede haber colores
 * literales (`#hex`, `rgb()`, `hsl()`) en `app/` ni en `lib/`. Los colores salen de los
 * tokens del tema (`text-primario`, `var(--club-acento)`) o, si son de estado, de la
 * paleta de Tailwind (`bg-red-100`). Así cada club puede cambiar su paleta sin que
 * quede un azul BioTeam suelto.
 *
 * El CSS lo controla `globals-css.test.ts`.
 */

const RAIZ = path.resolve(__dirname, '../../..');

const PERMITIDOS = [
  'app/_landing/',
  'lib/generated/',
  'lib/branding/tokens.ts',
];

function esTest(rel: string): boolean {
  return rel.includes('/__tests__/') || /\.test\.tsx?$/.test(rel);
}

function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    if (nombre === 'node_modules') continue;
    const abs = path.join(dir, nombre);
    if (statSync(abs).isDirectory()) salida.push(...archivos(abs));
    else if (/\.(ts|tsx)$/.test(nombre)) salida.push(abs);
  }
  return salida;
}

const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const FUNCION_COLOR = /\b(?:rgba?|hsla?)\(/g;

const revisados = ['app', 'lib']
  .flatMap((d) => archivos(path.join(RAIZ, d)))
  .map((abs) => path.relative(RAIZ, abs).split(path.sep).join('/'))
  .filter((rel) => !esTest(rel) && !PERMITIDOS.some((p) => rel === p || rel.startsWith(p)));

describe('sin colores literales en app/ y lib/', () => {
  test('el guard revisa archivos de verdad', () => {
    expect(revisados.length).toBeGreaterThan(100);
    expect(revisados).toContain('app/components/Sidebar.tsx');
    expect(revisados).not.toContain('lib/branding/tokens.ts');
  });

  test('ningún #hex, rgb() ni hsl() fuera de tokens.ts y la landing', () => {
    const hallazgos: string[] = [];
    for (const rel of revisados) {
      const lineas = readFileSync(path.join(RAIZ, rel), 'utf8').split('\n');
      lineas.forEach((linea, i) => {
        for (const m of [...linea.matchAll(HEX), ...linea.matchAll(FUNCION_COLOR)]) {
          hallazgos.push(`${rel}:${i + 1}  ${m[0]}`);
        }
      });
    }
    expect(hallazgos, 'Usá un token del tema (lib/branding/tokens.ts, app/globals.css)').toEqual([]);
  });

  test('el patrón detecta lo que tiene que detectar', () => {
    const casos = ['text-[#121A61]', "fill: '#fff'", 'rgba(0, 0, 0, 0.1)', 'hsl(220 10% 50%)', '#3346cc80'];
    for (const c of casos) {
      expect([...c.matchAll(HEX), ...c.matchAll(FUNCION_COLOR)].length, c).toBeGreaterThan(0);
    }
    for (const c of ['href="#contenido"', 'paso #1', '&#160;', 'var(--club-primario)', 'color-mix(in oklab, var(--x) 6%, transparent)']) {
      expect([...c.matchAll(HEX), ...c.matchAll(FUNCION_COLOR)], c).toEqual([]);
    }
  });
});
