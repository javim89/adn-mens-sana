import { describe, test, expect } from 'vitest';
import { appearanceClerk, cssDelTema, derivarTema, temaDelClub, versionTema } from '../tema';
import { contraste, esHex6, hexAOklch } from '../colores';
import { BLANCO, TEMA_BIOTEAM, TEMA_NEUTRO, VARS_TEMA, type Tema } from '../tokens';

function deltaTono(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

describe('tokens', () => {
  test.each([
    ['TEMA_BIOTEAM', TEMA_BIOTEAM],
    ['TEMA_NEUTRO', TEMA_NEUTRO],
  ])('%s: todos los valores son #rrggbb y el texto encima se lee', (_n, tema) => {
    for (const v of Object.values(tema)) expect(esHex6(v)).toBe(true);
    expect(contraste(tema.primario, tema.primarioForeground)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(tema.secundario, tema.secundarioForeground)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(tema.acento, tema.acentoForeground)).toBeGreaterThanOrEqual(4.5);
  });

  test('TEMA_BIOTEAM es la paleta de DESIGN.md', () => {
    expect(TEMA_BIOTEAM).toEqual({
      primario: '#121a61',
      primarioHover: '#1e2a8a',
      primarioForeground: '#ffffff',
      primarioSuave: '#eef0fb',
      secundario: '#3346cc',
      secundarioForeground: '#ffffff',
      acento: '#c9a84c',
      acentoForeground: '#1c1c1c',
      acentoSuave: '#eaddb5',
    });
  });
});

describe('derivarTema', () => {
  test('con todo nulo devuelve BioTeam', () => {
    expect(derivarTema({})).toEqual(TEMA_BIOTEAM);
    expect(derivarTema({ primario: null, secundario: null, acento: null })).toEqual(TEMA_BIOTEAM);
  });

  test('con valores inválidos también cae a BioTeam', () => {
    expect(derivarTema({ primario: 'red;}body{', secundario: 'azul', acento: '' })).toEqual(
      TEMA_BIOTEAM,
    );
  });

  test('la paleta BioTeam (en cualquier formato) da exactamente BioTeam', () => {
    expect(derivarTema({ primario: '#121A61', secundario: '#3346CC', acento: '#C9A84C' })).toEqual(
      TEMA_BIOTEAM,
    );
  });

  test('un primario oscuro se respeta tal cual', () => {
    const tema = derivarTema({ primario: '#8b0000' });
    expect(tema.primario).toBe('#8b0000');
    expect(tema.primarioForeground).toBe(BLANCO);
  });

  test.each(['#ffd700', '#87ceeb', '#ffffff', '#00a0e0'])(
    'un primario claro (%s) se oscurece hasta 4.5:1 con blanco',
    (hex) => {
      const tema = derivarTema({ primario: hex, secundario: hex });
      expect(contraste(tema.primario, BLANCO)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(tema.secundario, BLANCO)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(tema.primarioHover, BLANCO)).toBeGreaterThanOrEqual(4.5);
    },
  );

  test('el hover está a ±0.06 de L del primario y del mismo tono', () => {
    const tema = derivarTema({ primario: '#004d2c' });
    const p = hexAOklch(tema.primario);
    const h = hexAOklch(tema.primarioHover);
    expect(Math.abs(Math.abs(h.l - p.l) - 0.06)).toBeLessThan(0.01);
    expect(deltaTono(p.h, h.h)).toBeLessThan(6);
  });

  test('un primario en el límite de contraste tiene hover más oscuro', () => {
    const tema = derivarTema({ primario: '#ffd700' });
    expect(hexAOklch(tema.primarioHover).l).toBeLessThan(hexAOklch(tema.primario).l);
  });

  test('el "suave" del primario es un tinte claro del mismo tono', () => {
    const tema = derivarTema({ primario: '#8b0000' });
    expect(contraste(tema.primarioSuave, BLANCO)).toBeLessThan(1.25);
    expect(deltaTono(hexAOklch(tema.primarioSuave).h, hexAOklch('#8b0000').h)).toBeLessThan(8);
  });

  test('sin secundario se deriva del primario: más claro, mismo tono, legible', () => {
    const tema = derivarTema({ primario: '#004d2c' });
    const p = hexAOklch(tema.primario);
    const s = hexAOklch(tema.secundario);
    expect(s.l).toBeGreaterThan(p.l);
    expect(deltaTono(p.h, s.h)).toBeLessThan(8);
    expect(contraste(tema.secundario, BLANCO)).toBeGreaterThanOrEqual(4.5);
  });

  test('con secundario propio no se deriva', () => {
    expect(derivarTema({ primario: '#004d2c', secundario: '#5b2c83' }).secundario).toBe('#5b2c83');
  });

  test('sin acento queda el dorado', () => {
    const tema = derivarTema({ primario: '#004d2c' });
    expect(tema.acento).toBe(TEMA_BIOTEAM.acento);
    expect(tema.acentoForeground).toBe(TEMA_BIOTEAM.acentoForeground);
    expect(tema.acentoSuave).toBe(TEMA_BIOTEAM.acentoSuave);
  });

  test('el acento no se ajusta, pero su texto encima sí se elige por contraste', () => {
    const claro = derivarTema({ acento: '#ffd700' });
    expect(claro.acento).toBe('#ffd700');
    expect(contraste(claro.acento, claro.acentoForeground)).toBeGreaterThanOrEqual(4.5);
    const oscuro = derivarTema({ acento: '#3b0a45' });
    expect(oscuro.acentoForeground).toBe(BLANCO);
  });

  test('solo el acento no toca primario ni secundario', () => {
    const tema = derivarTema({ acento: '#ffd700' });
    expect(tema.primario).toBe(TEMA_BIOTEAM.primario);
    expect(tema.secundario).toBe(TEMA_BIOTEAM.secundario);
  });

  test('todos los valores derivados son #rrggbb', () => {
    const tema = derivarTema({ primario: '#FFD700', secundario: '#0af', acento: '#00ff7f' });
    for (const v of Object.values(tema)) expect(esHex6(v)).toBe(true);
  });
});

describe('temaDelClub', () => {
  test('lee las columnas del club', () => {
    expect(temaDelClub({ colorPrimario: '#8b0000', colorSecundario: null }).primario).toBe('#8b0000');
    expect(temaDelClub({ colorAcento: '#00ff7f' }).acento).toBe('#00ff7f');
  });

  test('sin club es BioTeam', () => {
    expect(temaDelClub(null)).toEqual(TEMA_BIOTEAM);
    expect(temaDelClub(undefined)).toEqual(TEMA_BIOTEAM);
  });
});

describe('cssDelTema', () => {
  test('emite todas las vars del tema en :root', () => {
    const css = cssDelTema(TEMA_BIOTEAM);
    expect(css.startsWith(':root{')).toBe(true);
    expect(css.endsWith('}')).toBe(true);
    for (const [k, v] of Object.entries(VARS_TEMA)) {
      expect(css).toContain(`${v}:${TEMA_BIOTEAM[k as keyof Tema]};`);
    }
  });

  test('solo emite hex válidos: lo inválido cae al default', () => {
    const malicioso = {
      ...TEMA_BIOTEAM,
      primario: 'red;}body{background:url(https://x)}',
      acento: '</style><script>alert(1)</script>',
      secundario: '#ABCDEF',
    } as Tema;
    const css = cssDelTema(malicioso);
    expect(css).toContain(`--club-primario:${TEMA_BIOTEAM.primario};`);
    expect(css).toContain(`--club-acento:${TEMA_BIOTEAM.acento};`);
    expect(css).toContain('--club-secundario:#abcdef;');
    expect(css).not.toMatch(/[<>{]body|url\(|script/);
    // Fuera del `:root{…}` no hay llaves extra.
    expect(css.match(/[{}]/g)).toEqual(['{', '}']);
    // Cada valor es un hex de 6 dígitos.
    for (const m of css.matchAll(/:(#[^;]*);/g)) expect(esHex6(m[1])).toBe(true);
  });
});

describe('versionTema', () => {
  test('estable para los mismos datos y sin importar mayúsculas', () => {
    const a = versionTema({ colorPrimario: '#8b0000', logoKey: 'clubes/x/logo/1.png' });
    expect(versionTema({ colorPrimario: '#8B0000', logoKey: 'clubes/x/logo/1.png' })).toBe(a);
    expect(a).toMatch(/^[0-9a-z]+$/);
  });

  test('cambia si cambian los colores o el logo', () => {
    const base = { colorPrimario: '#8b0000', colorSecundario: null, colorAcento: null, logoKey: 'a' };
    const v = versionTema(base);
    expect(versionTema({ ...base, colorPrimario: '#8b0001' })).not.toBe(v);
    expect(versionTema({ ...base, colorAcento: '#ffd700' })).not.toBe(v);
    expect(versionTema({ ...base, logoKey: 'b' })).not.toBe(v);
  });
});

describe('appearanceClerk', () => {
  test('usa el primario del tema', () => {
    expect(appearanceClerk(TEMA_BIOTEAM).variables.colorPrimary).toBe('#121a61');
    expect(appearanceClerk(derivarTema({ primario: '#8b0000' })).variables.colorPrimary).toBe('#8b0000');
    expect(appearanceClerk(TEMA_BIOTEAM).variables.colorBackground).toBe('#ffffff');
  });
});
