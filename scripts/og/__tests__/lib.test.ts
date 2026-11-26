import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { TEMA_BIOTEAM } from '@/lib/branding/tokens';
import {
  PALETA,
  armarRequest,
  cantidad,
  esReintentable,
  extraerImagen,
  leerApiKey,
  mensajeDeError,
} from '../lib.mjs';

let dir: string;
const envFile = (nombre: string, contenido: string) => {
  const archivo = path.join(dir, nombre);
  writeFileSync(archivo, contenido);
  return archivo;
};
const sinEnv = {} as NodeJS.ProcessEnv;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'og-lib-'));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('leerApiKey', () => {
  it('lee solo OPEN_ROUTER_API_KEY entre otras claves y comentarios', () => {
    const archivo = envFile(
      'a.env',
      '# comentario\nDATABASE_URL=postgres://secreto\nOPEN_ROUTER_API_KEY=sk-or-123 # la key\nOTRA=1\n',
    );
    expect(leerApiKey({ archivoEnv: archivo, env: sinEnv })).toBe('sk-or-123');
  });

  it('respeta comillas dobles y simples', () => {
    expect(leerApiKey({ archivoEnv: envFile('b.env', 'OPEN_ROUTER_API_KEY="sk-or-#456"\n'), env: sinEnv })).toBe('sk-or-#456');
    expect(leerApiKey({ archivoEnv: envFile('c.env', "export OPEN_ROUTER_API_KEY='sk-or-789'\n"), env: sinEnv })).toBe('sk-or-789');
  });

  it('ignora la línea comentada y cae al env', () => {
    const archivo = envFile('d.env', '# OPEN_ROUTER_API_KEY=vieja\n');
    expect(leerApiKey({ archivoEnv: archivo, env: { OPEN_ROUTER_API_KEY: 'del-env' } as unknown as NodeJS.ProcessEnv })).toBe('del-env');
  });

  it('sin key tira un error que no expone el contenido del archivo', () => {
    const archivo = envFile('e.env', 'DATABASE_URL=postgres://muy-secreto\n');
    expect(() => leerApiKey({ archivoEnv: archivo, env: sinEnv })).toThrowError('Falta OPEN_ROUTER_API_KEY en .env.local');
    try {
      leerApiKey({ archivoEnv: archivo, env: sinEnv });
    } catch (e) {
      expect(String((e as Error).message)).not.toContain('muy-secreto');
    }
  });

  it('sin archivo usa el env', () => {
    expect(leerApiKey({ archivoEnv: path.join(dir, 'no-existe'), env: { OPEN_ROUTER_API_KEY: 'x' } as unknown as NodeJS.ProcessEnv })).toBe('x');
  });
});

describe('armarRequest', () => {
  it('arma el body de la Images API con aspect ratio y referencias como data URL', () => {
    const body = armarRequest({
      modelo: 'google/gemini-3-pro-image',
      prompt: 'hola',
      referencias: [{ mime: 'image/png', base64: 'QUJD' }],
      aspectRatio: '16:9',
      resolucion: '2K',
    });
    expect(body).toEqual({
      model: 'google/gemini-3-pro-image',
      prompt: 'hola',
      n: 1,
      aspect_ratio: '16:9',
      resolution: '2K',
      input_references: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } }],
    });
  });

  it('sin referencias no manda input_references', () => {
    expect(armarRequest({ modelo: 'm', prompt: 'p' })).not.toHaveProperty('input_references');
  });
});

describe('extraerImagen', () => {
  const b64 = Buffer.from('png!').toString('base64');

  it('lee data[].b64_json de la Images API', () => {
    expect(extraerImagen({ data: [{ b64_json: b64 }] }).toString()).toBe('png!');
  });

  it('lee choices[0].message.images de chat completions', () => {
    const r = { choices: [{ message: { images: [{ image_url: { url: `data:image/png;base64,${b64}` } }] } }] };
    expect(extraerImagen(r).toString()).toBe('png!');
  });

  it('sin imagen tira con el texto truncado', () => {
    const largo = 'x'.repeat(1000);
    expect(() => extraerImagen({ choices: [{ message: { content: largo } }] })).toThrowError(/no trae imagen: x{300}…$/);
    expect(() => extraerImagen({})).toThrowError('La respuesta no trae imagen');
  });
});

describe('errores y topes', () => {
  it('el mensaje de error solo tiene status y error.message', () => {
    expect(mensajeDeError(402, { error: { message: 'sin crédito' }, extra: 'nada' })).toBe('OpenRouter respondió 402: sin crédito');
    expect(mensajeDeError(500, null)).toBe('OpenRouter respondió 500');
  });

  it('reintenta solo 429 y 5xx', () => {
    expect(esReintentable(429)).toBe(true);
    expect(esReintentable(503)).toBe(true);
    expect(esReintentable(400)).toBe(false);
    expect(esReintentable(402)).toBe(false);
  });

  it('--n va de 1 a 4', () => {
    expect(cantidad(undefined, 2)).toBe(2);
    expect(cantidad('4', 2)).toBe(4);
    expect(() => cantidad('5', 2)).toThrow();
    expect(() => cantidad('0', 2)).toThrow();
  });
});

describe('paleta de la plantilla', () => {
  it('PALETA coincide con TEMA_BIOTEAM', () => {
    expect(PALETA).toEqual({
      primario: TEMA_BIOTEAM.primario,
      primarioHover: TEMA_BIOTEAM.primarioHover,
      secundario: TEMA_BIOTEAM.secundario,
      acento: TEMA_BIOTEAM.acento,
      blanco: TEMA_BIOTEAM.primarioForeground,
    });
  });

  it('la plantilla no tiene colores fuera de la paleta: solo var(--…) y negro/blanco con alpha', () => {
    const html = readFileSync(path.resolve(__dirname, '../plantilla.html'), 'utf8');
    expect(html.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
    expect(html.match(/hsla?\(/gi) ?? []).toEqual([]);
    const rgbs = html.match(/rgba?\([^)]*\)/gi) ?? [];
    expect(rgbs.length).toBeGreaterThan(0);
    for (const c of rgbs) {
      expect(c.replace(/\s+/g, '')).toMatch(/^rgba\((0,0,0|255,255,255),(0?\.\d+|0|1)\)$/);
    }
  });

  it('la bajada es opcional: la inyecta componer.mjs y hay un layout sin bajada', () => {
    const html = readFileSync(path.resolve(__dirname, '../plantilla.html'), 'utf8');
    expect(html).toContain('__BAJADA__');
    expect(html).not.toMatch(/<p class="bajada">/);
    expect(html).toMatch(/\.centrado\.sin-bajada \.ventana \{ top: \d+px; \}/);
  });
});
