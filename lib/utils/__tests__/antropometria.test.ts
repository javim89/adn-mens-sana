import { describe, test, expect } from 'vitest';
import { computeAntropometriaSumatorias } from '../antropometria';

describe('computeAntropometriaSumatorias — IMC', () => {
  test('calcula IMC redondeado a 1 decimal (peso 70, talla 175 → 22.9)', () => {
    const { imc } = computeAntropometriaSumatorias({ peso: 70, talla: 175 });
    expect(imc).toBe(22.9);
  });

  test('IMC exacto (peso 80, talla 200 → 20.0)', () => {
    const { imc } = computeAntropometriaSumatorias({ peso: 80, talla: 200 });
    expect(imc).toBe(20);
  });

  test('talla 0 → imc undefined', () => {
    const { imc } = computeAntropometriaSumatorias({ peso: 70, talla: 0 });
    expect(imc).toBeUndefined();
  });

  test('talla undefined → imc undefined', () => {
    const { imc } = computeAntropometriaSumatorias({ peso: 70 });
    expect(imc).toBeUndefined();
  });

  test('peso undefined → imc undefined', () => {
    const { imc } = computeAntropometriaSumatorias({ talla: 175 });
    expect(imc).toBeUndefined();
  });

  test('valores no finitos (NaN) → imc undefined', () => {
    const { imc } = computeAntropometriaSumatorias({ peso: NaN, talla: 175 });
    expect(imc).toBeUndefined();
  });
});

describe('computeAntropometriaSumatorias — sumatoria de pliegues', () => {
  test('suma los 6 pliegues presentes', () => {
    const { sumatoriaPliegues } = computeAntropometriaSumatorias({
      pliegueTriceps: 10,
      pliegueSubescapular: 12,
      pliegueSupraespinal: 8,
      pliegueAbdominal: 15,
      pliegueMuslo: 20,
      plieguePantorrilla: 9,
    });
    expect(sumatoriaPliegues).toBe(74);
  });

  test('trata los pliegues ausentes como omitidos (suma solo los presentes)', () => {
    const { sumatoriaPliegues } = computeAntropometriaSumatorias({
      pliegueTriceps: 10,
      pliegueMuslo: 20,
    });
    expect(sumatoriaPliegues).toBe(30);
  });

  test('soporta decimales', () => {
    const { sumatoriaPliegues } = computeAntropometriaSumatorias({
      pliegueTriceps: 10.5,
      pliegueSubescapular: 12.5,
    });
    expect(sumatoriaPliegues).toBe(23);
  });

  test('ningún pliegue presente → undefined', () => {
    const { sumatoriaPliegues } = computeAntropometriaSumatorias({ peso: 70, talla: 175 });
    expect(sumatoriaPliegues).toBeUndefined();
  });
});

describe('computeAntropometriaSumatorias — combinado', () => {
  test('devuelve ambos valores cuando hay datos suficientes', () => {
    const result = computeAntropometriaSumatorias({
      peso: 70,
      talla: 175,
      pliegueTriceps: 10,
      pliegueSubescapular: 12,
    });
    expect(result).toEqual({ imc: 22.9, sumatoriaPliegues: 22 });
  });

  test('objeto vacío → ambos undefined', () => {
    expect(computeAntropometriaSumatorias({})).toEqual({
      imc: undefined,
      sumatoriaPliegues: undefined,
    });
  });
});
