import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_SIN_MERIENDA,
  FILTROS_COMIDA,
  coincideFiltroComida,
  comidasPrevistas,
  esFiltroComida,
  recibeMerienda,
} from '../viandas';

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

describe('recibeMerienda', () => {
  // Nombres exactos de `categorias.nombre` (scripts/seed-categorias.mjs). Si alguien
  // renombra una categoría en el catálogo, este test es el que tiene que avisar.
  it.each(['Reserva', '9na', '8va', '7ma', '6ta', '5ta', '4ta'])('%s no recibe merienda', (cat) => {
    expect(recibeMerienda(cat)).toBe(false);
  });

  it('la lista exportada es exactamente la de la regla', () => {
    expect([...CATEGORIAS_SIN_MERIENDA].sort()).toEqual(
      ['Reserva', '9na', '8va', '7ma', '6ta', '5ta', '4ta'].sort(),
    );
  });

  it.each(['SUB-12', 'SUB-16', 'Primera', 'División de Honor', 'Veteranos'])(
    '%s sí recibe merienda',
    (cat) => {
      expect(recibeMerienda(cat)).toBe(true);
    },
  );

  it.each([null, undefined, ''])('sin categoría (%o) sí recibe merienda', (cat) => {
    expect(recibeMerienda(cat)).toBe(true);
  });

  it('compara el nombre exacto, sin normalizar mayúsculas', () => {
    expect(recibeMerienda('reserva')).toBe(true);
    expect(recibeMerienda('5TA')).toBe(true);
  });
});

describe('comidasPrevistas', () => {
  it('desayuno siempre; merienda según la categoría', () => {
    expect(comidasPrevistas({ ...NINGUNA, recibeMerienda: false })).toEqual({
      DESAYUNO: true,
      ALMUERZO: false,
      MERIENDA: false,
      CENA: false,
    });
    expect(comidasPrevistas({ ...AMBAS, recibeMerienda: true })).toEqual({
      DESAYUNO: true,
      ALMUERZO: true,
      MERIENDA: true,
      CENA: true,
    });
  });

  it('almuerzo y cena siguen saliendo de la ficha', () => {
    const p = comidasPrevistas({ ...SOLO_CENA, recibeMerienda: false });
    expect(p.ALMUERZO).toBe(false);
    expect(p.CENA).toBe(true);
    expect(p.MERIENDA).toBe(false);
  });
});
