import { describe, test, expect } from 'vitest';
import { subtituloFicha } from '../_lib/ficha';

describe('subtituloFicha', () => {
  test('arma "disciplina · categoría · posición · edad"', () => {
    expect(
      subtituloFicha({ disciplina: 'Fútbol', categoria: '4ta', posicion: 'Delantero', edad: 17 }),
    ).toBe('Fútbol · 4ta · Delantero · 17 años');
  });

  test('omite lo que no está cargado', () => {
    expect(subtituloFicha({ disciplina: 'Hockey', categoria: null, posicion: '  ', edad: 15 })).toBe(
      'Hockey · 15 años',
    );
    expect(subtituloFicha({})).toBe('');
  });
});
