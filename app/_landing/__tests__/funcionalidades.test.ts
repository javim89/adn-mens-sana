import { describe, expect, it } from 'vitest';
import { calcularEscala, LIENZO_ALTO, LIENZO_ANCHO } from '../funcionalidades';

describe('calcularEscala', () => {
  it('escala el lienzo para que llene el ancho de la ventana', () => {
    expect(calcularEscala(640)).toBeCloseTo(0.5);
    expect(calcularEscala(832)).toBeCloseTo(0.65);
    expect(calcularEscala(LIENZO_ANCHO)).toBe(1);
  });

  it('con el ancho de la ventana escalado, el lienzo no la desborda en ningún eje', () => {
    for (const ancho of [656, 832, 911]) {
      const escala = calcularEscala(ancho);
      expect(LIENZO_ANCHO * escala).toBeCloseTo(ancho);
      // La ventana tiene la misma proporción que el lienzo (`lg:aspect-[1280/832]`).
      expect(LIENZO_ALTO * escala).toBeCloseTo((ancho * LIENZO_ALTO) / LIENZO_ANCHO);
    }
  });

  it('nunca da negativa', () => {
    expect(calcularEscala(0)).toBe(0);
    expect(calcularEscala(-10)).toBe(0);
  });
});
