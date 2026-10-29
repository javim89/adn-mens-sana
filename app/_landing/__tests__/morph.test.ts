import { describe, expect, it } from 'vitest';
import {
  acercar,
  clamp,
  contar,
  enProgreso,
  PIN_VH,
  deltaHaciaSlot,
  encajarVentana,
  progresoScroll,
  salida,
  suave,
  tramo,
  transformCard,
} from '../morph';

describe('morph — helpers puros', () => {
  it('clamp y suave quedan en [0, 1] y fijan los extremos', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(2)).toBe(1);
    expect(suave(0)).toBe(0);
    expect(suave(1)).toBe(1);
    expect(suave(0.5)).toBeCloseTo(0.5);
  });

  it('tramo: 0 antes de su inicio, 1 después de su fin, suavizado en el medio', () => {
    expect(tramo(0.1, 0.2, 0.6)).toBe(0);
    expect(tramo(0.7, 0.2, 0.6)).toBe(1);
    expect(tramo(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(tramo(0.25, 0.2, 0.6)).toBeLessThan(0.125); // ease-in: arranca lento
  });

  it('progresoScroll: proporción del recorrido, sin salirse de [0, 1]', () => {
    expect(progresoScroll(0, 100, 1000)).toBe(0);
    expect(progresoScroll(600, 100, 1000)).toBe(0.5);
    expect(progresoScroll(5000, 100, 1000)).toBe(1);
    expect(progresoScroll(500, 100, 0)).toBe(0);
  });

  it('encajarVentana: escala por el lado que limita y centra en el espacio libre', () => {
    const r = encajarVentana(
      { ancho: 1440, alto: 900 },
      { ancho: 1516, alto: 900 },
      { arriba: 92, abajo: 28, lados: 48 },
    );
    // Ancho libre 1344/1516 = 0.886; alto libre 780/900 = 0.867 → limita el alto.
    expect(r.escala).toBeCloseTo(780 / 900);
    expect(r.y).toBeCloseTo(92);
    expect(r.x).toBeCloseTo((1440 - 1516 * r.escala) / 2);
  });

  it('encajarVentana nunca agranda más allá de 1', () => {
    const r = encajarVentana({ ancho: 4000, alto: 3000 }, { ancho: 1000, alto: 500 }, { arriba: 0, abajo: 0, lados: 0 });
    expect(r.escala).toBe(1);
  });

  it('deltaHaciaSlot lleva el origen de la card a la esquina del slot escalado', () => {
    const d = deltaHaciaSlot({ x: 100, y: 50 }, { x: 200, y: 300 }, { escala: 0.5, x: 40, y: 80 });
    expect(d).toEqual({ x: 40 + 100 - 100, y: 80 + 150 - 50 });
  });

  it('transformCard: identidad en t=0 y traslación + escala completas en t=1', () => {
    expect(transformCard({ x: 10, y: -20 }, 0.8, 0)).toBe('translate3d(0px, 0px, 0) scale(1)');
    expect(transformCard({ x: 10, y: -20 }, 0.8, 1)).toBe('translate3d(10px, -20px, 0) scale(0.8)');
  });

  it('salida (ease-out) mueve casi todo al principio', () => {
    expect(salida(0)).toBe(0);
    expect(salida(1)).toBe(1);
    expect(salida(0.25)).toBeGreaterThan(0.5);
    expect(tramo(0.175, 0, 0.7, salida)).toBeCloseTo(salida(0.25));
  });

  it('acercar persigue al objetivo y lo alcanza (scrub suave, en ambos sentidos)', () => {
    expect(acercar(0, 1)).toBeCloseTo(0.15);
    expect(acercar(1, 0)).toBeCloseTo(0.85);
    let v = 0;
    let pasos = 0;
    while (v !== 1 && pasos < 200) {
      v = acercar(v, 1);
      pasos++;
    }
    expect(v).toBe(1);
    expect(pasos).toBeLessThan(60);
  });

  it('enProgreso: alargar el pin no corre la etapa 1 (termina a la misma distancia en px)', () => {
    const [, finEtapa1] = enProgreso([0, 0.91]);
    // Antes: pin de 1.3 viewports con las cards llegando en p = 0.7.
    expect(finEtapa1 * PIN_VH).toBeCloseTo(0.7 * 1.3, 2);
    expect(enProgreso([1, 2], 2)).toEqual([0.5, 1]);
  });

  it('contar', () => {
    expect(contar(212, 0)).toBe(0);
    expect(contar(212, 0.5)).toBe(106);
    expect(contar(212, 1)).toBe(212);
    expect(contar(42, 2)).toBe(42);
  });
});
