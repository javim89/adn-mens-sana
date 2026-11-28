import { describe, test, expect } from 'vitest';
import { resumirPorCategoria, SIN_CATEGORIA } from '../turnos';

describe('resumirPorCategoria', () => {
  test('cuenta por categoría, por cantidad desc', () => {
    const r = resumirPorCategoria([
      { categoria: { nombre: '6ta división' } },
      { categoria: { nombre: '6ta división' } },
      { categoria: { nombre: '4ta división' } },
      { categoria: { nombre: '6ta división' } },
    ]);
    expect(r).toEqual([
      { categoria: '6ta división', cantidad: 3 },
      { categoria: '4ta división', cantidad: 1 },
    ]);
  });

  test('empate: orden alfabético', () => {
    const r = resumirPorCategoria([{ categoria: { nombre: '5ta' } }, { categoria: { nombre: '4ta' } }]);
    expect(r.map((x) => x.categoria)).toEqual(['4ta', '5ta']);
  });

  test('sin categoría va al final', () => {
    const r = resumirPorCategoria([{ categoria: null }, {}, { categoria: { nombre: '4ta' } }]);
    expect(r).toEqual([
      { categoria: '4ta', cantidad: 1 },
      { categoria: SIN_CATEGORIA, cantidad: 2 },
    ]);
  });

  test('lista vacía', () => {
    expect(resumirPorCategoria([])).toEqual([]);
  });
});
