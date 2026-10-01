import { describe, test, expect } from 'vitest';
import {
  calcularVariacion,
  tonoVariacion,
  textoVariacion,
  type Variacion,
} from '../_lib/variacion';

describe('calcularVariacion', () => {
  /**
   * EL CAMINO POR DEFECTO DEL DÍA 1, no un borde exótico: la base no tiene seed de
   * triage y el cron escribe filas dentro de la semana actual, así que no hay nada
   * antes del corte. `null` es "no hay con qué comparar", y no se puede confundir
   * con "había base y era cero".
   */
  test('sin dato previo devuelve sin_base, no un delta de cero', () => {
    expect(calcularVariacion(7, null)).toEqual({ tipo: 'sin_base' });
  });

  test('sin_base incluso cuando el actual también es cero', () => {
    expect(calcularVariacion(0, null)).toEqual({ tipo: 'sin_base' });
  });

  /**
   * Previo 0 y actual > 0: dividir daría `Infinity`. El absoluto es el único número
   * honesto, y la UI lo muestra como "+3 (antes 0)".
   */
  test('previo en cero y actual positivo devuelve el absoluto, nunca Infinity', () => {
    expect(calcularVariacion(3, 0)).toEqual({ tipo: 'desde_cero', actual: 3 });
  });

  test('previo y actual en cero es sin_cambio, no desde_cero', () => {
    expect(calcularVariacion(0, 0)).toEqual({ tipo: 'sin_cambio' });
  });

  test('valores iguales distintos de cero es sin_cambio', () => {
    expect(calcularVariacion(12, 12)).toEqual({ tipo: 'sin_cambio' });
  });

  test('una subida devuelve puntos y porcentaje positivos', () => {
    expect(calcularVariacion(12, 10)).toEqual({
      tipo: 'delta',
      puntos: 2,
      porcentaje: 20,
      direccion: 'sube',
    });
  });

  test('una bajada devuelve puntos y porcentaje negativos', () => {
    expect(calcularVariacion(8, 10)).toEqual({
      tipo: 'delta',
      puntos: -2,
      porcentaje: -20,
      direccion: 'baja',
    });
  });

  // El borde simétrico del desde_cero: bajar a cero es −100%, no una división rara.
  test('bajar a cero es −100%', () => {
    expect(calcularVariacion(0, 5)).toEqual({
      tipo: 'delta',
      puntos: -5,
      porcentaje: -100,
      direccion: 'baja',
    });
  });

  test('duplicarse es +100%', () => {
    expect(calcularVariacion(10, 5)).toMatchObject({ porcentaje: 100, direccion: 'sube' });
  });

  test('redondea el porcentaje al entero', () => {
    // 1/3 = 33.33… → 33
    expect(calcularVariacion(4, 3)).toMatchObject({ porcentaje: 33 });
    // 2/3 = 66.66… → 67
    expect(calcularVariacion(5, 3)).toMatchObject({ porcentaje: 67 });
  });

  test('ningún caso produce NaN ni Infinity', () => {
    const casos: [number, number | null][] = [
      [0, null],
      [5, null],
      [0, 0],
      [3, 0],
      [0, 3],
      [7, 7],
      [1, 3],
    ];
    for (const [actual, previo] of casos) {
      const v = calcularVariacion(actual, previo);
      if (v.tipo === 'delta') {
        expect(Number.isFinite(v.porcentaje)).toBe(true);
        expect(Number.isFinite(v.puntos)).toBe(true);
      }
    }
  });
});

/**
 * EL BUG DE UX MÁS FÁCIL DE COMETER: el color no puede salir de la dirección sola.
 * En triage subir es EMPEORAR (más deportistas en rojo), al revés que en presentismo.
 */
describe('tonoVariacion — el color sale del sentido, no de la dirección', () => {
  const sube = calcularVariacion(12, 10);
  const baja = calcularVariacion(8, 10);

  test('en triage (menos es mejor) subir es MALO', () => {
    expect(tonoVariacion(sube, 'menos_es_mejor')).toBe('malo');
  });

  test('en triage (menos es mejor) bajar es BUENO', () => {
    expect(tonoVariacion(baja, 'menos_es_mejor')).toBe('bueno');
  });

  test('en presentismo (más es mejor) subir es BUENO', () => {
    expect(tonoVariacion(sube, 'mas_es_mejor')).toBe('bueno');
  });

  test('en presentismo (más es mejor) bajar es MALO', () => {
    expect(tonoVariacion(baja, 'mas_es_mejor')).toBe('malo');
  });

  // La misma dirección con el sentido opuesto da el color opuesto: es exactamente la
  // propiedad que se rompería si el color se derivara del cálculo.
  test('la misma variación cambia de color al cambiar el sentido', () => {
    expect(tonoVariacion(sube, 'menos_es_mejor')).not.toBe(
      tonoVariacion(sube, 'mas_es_mejor'),
    );
  });

  test('desde_cero se trata como una subida', () => {
    const v = calcularVariacion(3, 0);
    expect(tonoVariacion(v, 'menos_es_mejor')).toBe('malo');
    expect(tonoVariacion(v, 'mas_es_mejor')).toBe('bueno');
  });

  // Sin base no hay juicio de valor posible: neutro en los dos sentidos.
  test.each<Variacion>([{ tipo: 'sin_base' }, { tipo: 'sin_cambio' }])(
    '%o es neutro, sea cual sea el sentido',
    (v) => {
      expect(tonoVariacion(v, 'menos_es_mejor')).toBe('neutro');
      expect(tonoVariacion(v, 'mas_es_mejor')).toBe('neutro');
    },
  );
});

describe('textoVariacion', () => {
  /**
   * El copy del día 1. Tiene que verse INTENCIONAL — "sin comparación previa" —, no
   * como un dato que falta, y nunca como un 0% mentiroso.
   */
  test('sin_base dice que no hay comparación, no un 0%', () => {
    const texto = textoVariacion({ tipo: 'sin_base' });
    expect(texto).toBe('sin comparación previa');
    expect(texto).not.toContain('0%');
  });

  test('desde_cero muestra el absoluto y aclara que antes era 0', () => {
    expect(textoVariacion(calcularVariacion(3, 0))).toBe(
      '+3 vs. la semana anterior (antes 0)',
    );
  });

  test('sin_cambio lo dice explícitamente', () => {
    expect(textoVariacion({ tipo: 'sin_cambio' })).toBe('sin cambios vs. la semana anterior');
  });

  test('una subida se muestra con + en puntos y en porcentaje', () => {
    expect(textoVariacion(calcularVariacion(12, 10))).toBe(
      '+2 (+20%) vs. la semana anterior',
    );
  });

  // El signo menos es U+2212 (−), no un guion ASCII: es el que usa el resto del repo
  // para números negativos.
  test('una bajada se muestra con el signo menos tipográfico', () => {
    expect(textoVariacion(calcularVariacion(8, 10))).toBe('−2 (−20%) vs. la semana anterior');
  });

  test('ningún texto contiene NaN, Infinity ni undefined', () => {
    const variaciones: Variacion[] = [
      { tipo: 'sin_base' },
      { tipo: 'sin_cambio' },
      calcularVariacion(3, 0),
      calcularVariacion(0, 5),
      calcularVariacion(12, 10),
    ];
    for (const v of variaciones) {
      expect(textoVariacion(v)).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
