import { describe, it, expect } from 'vitest';
import { FILTROS_COMIDA, coincideFiltroComida, esFiltroComida } from '../viandas';

const NINGUNA = { recibeAlmuerzo: false, recibeCena: false };
const SOLO_ALMUERZO = { recibeAlmuerzo: true, recibeCena: false };
const SOLO_CENA = { recibeAlmuerzo: false, recibeCena: true };
const AMBAS = { recibeAlmuerzo: true, recibeCena: true };

describe('coincideFiltroComida', () => {
  it.each([
    // [perfil, null, ALMUERZO, CENA, AMBAS]
    ['ninguna', NINGUNA, true, false, false, false],
    ['solo almuerzo', SOLO_ALMUERZO, true, true, false, false],
    ['solo cena', SOLO_CENA, true, false, true, false],
    ['ambas', AMBAS, true, true, true, true],
  ] as const)('%s', (_, flags, todos, almuerzo, cena, ambas) => {
    expect(coincideFiltroComida(flags, null)).toBe(todos);
    expect(coincideFiltroComida(flags, 'ALMUERZO')).toBe(almuerzo);
    expect(coincideFiltroComida(flags, 'CENA')).toBe(cena);
    expect(coincideFiltroComida(flags, 'AMBAS')).toBe(ambas);
  });
});

describe('esFiltroComida', () => {
  it('acepta los tres filtros', () => {
    for (const f of FILTROS_COMIDA) expect(esFiltroComida(f)).toBe(true);
  });

  it.each([undefined, null, '', 'FOO', 'almuerzo', 'DESAYUNO', ['CENA'], 1])(
    'rechaza %o',
    (v) => {
      expect(esFiltroComida(v)).toBe(false);
    },
  );
});
