import { describe, test, expect } from 'vitest';
import { condicionPartido, rivalPartido } from '../partido';

describe('condicionPartido', () => {
  test('local propio → Local', () => {
    expect(
      condicionPartido({ local: { nombre: 'Club', esPropio: true }, visitante: { nombre: 'Rival', esPropio: false } }),
    ).toBe('Local');
  });

  test('visitante propio → Visitante', () => {
    expect(
      condicionPartido({ local: { nombre: 'Rival', esPropio: false }, visitante: { nombre: 'Club', esPropio: true } }),
    ).toBe('Visitante');
  });

  test('ninguno propio (o sin el dato) → null', () => {
    expect(condicionPartido({ local: { esPropio: false }, visitante: { esPropio: false } })).toBeNull();
    expect(condicionPartido({ local: { nombre: 'A' }, visitante: { nombre: 'B' } })).toBeNull();
  });
});

describe('rivalPartido', () => {
  test('es el equipo que no es el propio', () => {
    expect(
      rivalPartido({ local: { nombre: 'Club', esPropio: true }, visitante: { nombre: 'Rival', esPropio: false } }),
    ).toBe('Rival');
    expect(
      rivalPartido({ local: { nombre: 'Rival', esPropio: false }, visitante: { nombre: 'Club', esPropio: true } }),
    ).toBe('Rival');
  });

  test('sin equipo propio no hay rival', () => {
    expect(rivalPartido({ local: { nombre: 'A' }, visitante: { nombre: 'B' } })).toBeNull();
  });
});
