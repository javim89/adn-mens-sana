import { describe, test, expect } from 'vitest';
import { agruparPorPosicion, contarPorEstado, SIN_POSICION } from '../convocatorias';

describe('agruparPorPosicion', () => {
  test('agrupa ignorando espacios, mayúsculas y tildes', () => {
    const r = agruparPorPosicion([
      { posicion: 'Arquero' },
      { posicion: ' arquero ' },
      { posicion: 'ARQUERO' },
      { posicion: 'Delantero' },
      { posicion: 'delantero' },
      { posicion: 'Medio  Campista' },
      { posicion: 'medio campísta' },
    ]);
    expect(r.map((g) => g.cantidad)).toEqual([3, 2, 2]);
    expect(r[0]).toEqual({ posicion: 'Arquero', cantidad: 3 });
  });

  test('el rótulo es la escritura más común del grupo', () => {
    const r = agruparPorPosicion([
      { posicion: 'DEFENSOR' },
      { posicion: 'DEFENSOR' },
      { posicion: 'defensor' },
    ]);
    expect(r).toEqual([{ posicion: 'DEFENSOR', cantidad: 3 }]);
  });

  test('si las escrituras empatan, el rótulo va capitalizado', () => {
    const r = agruparPorPosicion([{ posicion: 'LATERAL' }, { posicion: 'lateral' }]);
    expect(r).toEqual([{ posicion: 'Lateral', cantidad: 2 }]);
  });

  test('null, vacío y espacios van a "Sin posición", al final', () => {
    const r = agruparPorPosicion([
      { posicion: null },
      { posicion: '' },
      { posicion: '   ' },
      { posicion: undefined },
      { posicion: 'Arquero' },
    ]);
    expect(r).toEqual([
      { posicion: 'Arquero', cantidad: 1 },
      { posicion: SIN_POSICION, cantidad: 4 },
    ]);
  });

  test('ordena por cantidad desc y luego alfabéticamente', () => {
    const r = agruparPorPosicion([
      { posicion: 'Volante' },
      { posicion: 'Arquero' },
      { posicion: 'Delantero' },
      { posicion: 'Delantero' },
    ]);
    expect(r.map((g) => g.posicion)).toEqual(['Delantero', 'Arquero', 'Volante']);
  });

  test('lista vacía', () => {
    expect(agruparPorPosicion([])).toEqual([]);
  });
});

describe('contarPorEstado', () => {
  test('zero-fill de los 4 estados', () => {
    expect(
      contarPorEstado([{ estado: 'ACTIVO' }, { estado: 'ACTIVO' }, { estado: 'LESIONADO' }]),
    ).toEqual({ ACTIVO: 2, LESIONADO: 1, SUSPENDIDO: 0, INACTIVO: 0 });
  });
});
