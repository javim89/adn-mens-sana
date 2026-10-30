import { describe, test, expect } from 'vitest';
import {
  asegurarContraste,
  contraste,
  esHex6,
  foregroundPara,
  hexAOklch,
  hexARgb,
  luminanciaRelativa,
  mezclar,
  normalizarHex,
  oklabARgb,
  oklchAHex,
  rgbAHex,
  rgbAOklab,
  tinte,
} from '../colores';
import { BLANCO, TEMA_BIOTEAM, TEXTO_OSCURO } from '../tokens';

/** Diferencia de tono en grados, por el camino corto. */
function deltaTono(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

describe('normalizarHex / esHex6', () => {
  test.each([
    ['#121A61', '#121a61'],
    ['121a61', '#121a61'],
    ['  #ABC ', '#aabbcc'],
    ['fff', '#ffffff'],
  ])('%s → %s', (entrada, salida) => {
    expect(normalizarHex(entrada)).toBe(salida);
  });

  test.each([
    'red',
    '#12345',
    '#1234567',
    '#12g45a',
    'rgb(0,0,0)',
    'red;}body{background:url(x)',
    '#121a61;}body{color:red',
    '',
    null,
    undefined,
    42,
  ])('rechaza %s', (entrada) => {
    expect(normalizarHex(entrada)).toBeNull();
  });

  test('esHex6 solo acepta #rrggbb en minúscula', () => {
    expect(esHex6('#121a61')).toBe(true);
    expect(esHex6('#121A61')).toBe(false);
    expect(esHex6('#abc')).toBe(false);
    expect(esHex6('121a61')).toBe(false);
    expect(esHex6(null)).toBe(false);
  });
});

describe('conversiones', () => {
  test('hex ↔ rgb', () => {
    expect(hexARgb('#121A61')).toEqual({ r: 18, g: 26, b: 97 });
    expect(rgbAHex({ r: 18, g: 26, b: 97 })).toBe('#121a61');
    expect(rgbAHex({ r: 300, g: -4, b: 127.6 })).toBe('#ff0080');
  });

  test('hexARgb tira con un color inválido', () => {
    expect(() => hexARgb('azul')).toThrow();
  });

  test('blanco y negro en OKLab', () => {
    const blanco = rgbAOklab({ r: 255, g: 255, b: 255 });
    expect(blanco.l).toBeCloseTo(1, 3);
    expect(blanco.a).toBeCloseTo(0, 3);
    expect(blanco.b).toBeCloseTo(0, 3);
    expect(rgbAOklab({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 6);
  });

  test.each(Object.values(TEMA_BIOTEAM))('round-trip OKLCH de %s', (hex) => {
    expect(oklchAHex(hexAOklch(hex))).toBe(hex);
  });

  test('round-trip OKLab de colores saturados', () => {
    for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#ffd700', '#00a0e0']) {
      expect(rgbAHex(oklabARgb(rgbAOklab(hexARgb(hex))))).toBe(hex);
    }
  });

  test('el azul de BioTeam tiene tono azul (≈270°)', () => {
    const { l, h } = hexAOklch('#121a61');
    expect(h).toBeGreaterThan(260);
    expect(h).toBeLessThan(280);
    expect(l).toBeLessThan(0.3);
  });

  test('oklchAHex baja el croma fuera de gamut sin correr el tono', () => {
    const hex = oklchAHex({ l: 0.5, c: 0.6, h: 270 });
    expect(normalizarHex(hex)).toBe(hex);
    expect(deltaTono(hexAOklch(hex).h, 270)).toBeLessThan(3);
    expect(hexAOklch(hex).l).toBeCloseTo(0.5, 2);
  });
});

describe('contraste WCAG', () => {
  test('luminancias extremas', () => {
    expect(luminanciaRelativa('#ffffff')).toBeCloseTo(1, 6);
    expect(luminanciaRelativa('#000000')).toBeCloseTo(0, 6);
  });

  test('ratios conocidos', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // El navy de BioTeam contra blanco: ≈15.6:1.
    expect(contraste('#121a61', BLANCO)).toBeGreaterThan(15);
    expect(contraste('#121a61', BLANCO)).toBeLessThan(16.5);
    expect(contraste('#767676', BLANCO)).toBeCloseTo(4.54, 1);
    expect(contraste('#3346cc', BLANCO)).toBeGreaterThan(4.5);
  });

  test('es simétrico', () => {
    expect(contraste('#c9a84c', '#121a61')).toBe(contraste('#121a61', '#c9a84c'));
  });

  test('foregroundPara elige blanco sobre oscuro y el texto oscuro sobre claro', () => {
    expect(foregroundPara('#121a61')).toBe(BLANCO);
    expect(foregroundPara('#3346cc')).toBe(BLANCO);
    expect(foregroundPara('#c9a84c')).toBe(TEXTO_OSCURO);
    expect(foregroundPara('#ffff00')).toBe(TEXTO_OSCURO);
  });
});

describe('asegurarContraste', () => {
  test('no toca un color que ya cumple', () => {
    expect(asegurarContraste('#121A61')).toBe('#121a61');
  });

  test.each(['#ffd700', '#00a0e0', '#87ceeb', '#ff69b4', '#9acd32', '#ffffff', '#c9a84c', '#e0e0e0'])(
    '%s queda ≥4.5 contra blanco conservando el tono',
    (hex) => {
      const ajustado = asegurarContraste(hex);
      expect(contraste(ajustado, BLANCO)).toBeGreaterThanOrEqual(4.5);
      const antes = hexAOklch(hex);
      const despues = hexAOklch(ajustado);
      expect(despues.l).toBeLessThan(antes.l);
      // Los grises no tienen tono; el resto lo conserva.
      if (antes.c > 0.04) expect(deltaTono(antes.h, despues.h)).toBeLessThan(6);
    },
  );

  test('busca el más claro que cumple, no cualquiera', () => {
    const ajustado = asegurarContraste('#ffd700');
    expect(contraste(ajustado, BLANCO)).toBeLessThan(5);
  });

  test('contra un fondo oscuro aclara', () => {
    const ajustado = asegurarContraste('#121a61', '#000000', 4.5);
    expect(contraste(ajustado, '#000000')).toBeGreaterThanOrEqual(4.5);
    expect(hexAOklch(ajustado).l).toBeGreaterThan(hexAOklch('#121a61').l);
  });

  test('respeta otro mínimo', () => {
    expect(contraste(asegurarContraste('#00a0e0', BLANCO, 7), BLANCO)).toBeGreaterThanOrEqual(7);
  });
});

describe('mezclar / tinte', () => {
  test('mezclar en los extremos devuelve cada color', () => {
    expect(mezclar('#121a61', '#ffffff', 0)).toBe('#121a61');
    expect(mezclar('#121a61', '#ffffff', 1)).toBe('#ffffff');
  });

  test('tinte reproduce los "suave" de BioTeam', () => {
    const cerca = (a: string, b: string) => {
      const x = hexARgb(a);
      const y = hexARgb(b);
      return Math.max(Math.abs(x.r - y.r), Math.abs(x.g - y.g), Math.abs(x.b - y.b));
    };
    expect(cerca(tinte('#121a61', 0.957, 0.12), TEMA_BIOTEAM.primarioSuave)).toBeLessThanOrEqual(3);
    expect(cerca(tinte('#c9a84c', 0.898, 0.465), TEMA_BIOTEAM.acentoSuave)).toBeLessThanOrEqual(3);
  });

  test('el tinte es claro y del mismo tono', () => {
    const t = tinte('#c8102e', 0.95, 0.15);
    expect(contraste(t, BLANCO)).toBeLessThan(1.2);
    expect(deltaTono(hexAOklch(t).h, hexAOklch('#c8102e').h)).toBeLessThan(6);
  });
});
