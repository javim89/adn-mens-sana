import { describe, test, expect } from 'vitest';
import { tieneAlergias } from '../salud';

describe('tieneAlergias', () => {
  test('true si la ficha registra ALERGIAS', () => {
    expect(
      tieneAlergias({ enfermedadesPreexistentes: [{ enfermedad: 'ASMA' }, { enfermedad: 'ALERGIAS' }] }),
    ).toBe(true);
  });

  test('false sin alergias, sin enfermedades o sin ficha', () => {
    expect(tieneAlergias({ enfermedadesPreexistentes: [{ enfermedad: 'ASMA' }] })).toBe(false);
    expect(tieneAlergias({ enfermedadesPreexistentes: [] })).toBe(false);
    expect(tieneAlergias({})).toBe(false);
    expect(tieneAlergias(null)).toBe(false);
    expect(tieneAlergias(undefined)).toBe(false);
  });
});
