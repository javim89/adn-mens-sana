/**
 * El delta entre dos períodos, como función pura, porque acá están todos los
 * bordes: sin base, desde cero, bajada a cero, redondeo.
 *
 * Se modela como **unión discriminada y no como un número con flags** para que sea
 * imposible renderizar un `NaN`, un `Infinity` o un "0%" que en realidad significa
 * "no hay con qué comparar". Cada caso tiene su propio copy en la UI.
 */
export type Variacion =
  /** No hay NINGÚN dato antes del corte. No es cero: es que no hay con qué comparar. */
  | { tipo: 'sin_base' }
  /** Había base, pero este nivel estaba en 0 → se muestra el absoluto ("+3 nuevos"), no un %. */
  | { tipo: 'desde_cero'; actual: number }
  | { tipo: 'sin_cambio' }
  | {
      tipo: 'delta';
      /** Diferencia absoluta, con signo. */
      puntos: number;
      /** Variación porcentual, con signo y redondeada al entero. */
      porcentaje: number;
      direccion: 'sube' | 'baja';
    };

/**
 * `previo === null` significa "no hay base" y es el camino POR DEFECTO del día 1:
 * con la base sin seed de triage, el cron escribe filas dentro de la semana actual,
 * así que no hay ninguna anterior al corte. No se puede confundir con `previo === 0`
 * ("había base y era cero"), que sí admite comparación.
 */
export function calcularVariacion(actual: number, previo: number | null): Variacion {
  if (previo === null) return { tipo: 'sin_base' };
  if (actual === previo) return { tipo: 'sin_cambio' };
  // Dividir por cero daría Infinity: el absoluto es el único número honesto acá.
  if (previo === 0) return { tipo: 'desde_cero', actual };

  const puntos = actual - previo;
  return {
    tipo: 'delta',
    puntos,
    porcentaje: Math.round((puntos / previo) * 100),
    direccion: puntos > 0 ? 'sube' : 'baja',
  };
}

/**
 * Para qué métrica subir es bueno.
 *
 * En triage **subir es empeorar** (más deportistas en rojo), así que la flecha
 * hacia arriba va en rojo — invertido respecto de una métrica de negocio como el
 * presentismo. Es el bug de UX más fácil de cometer acá, y por eso el color **no
 * sale del cálculo**: la card recibe el sentido y `direccion` solo decide la flecha.
 */
export type Sentido = 'menos_es_mejor' | 'mas_es_mejor';

export type Tono = 'bueno' | 'malo' | 'neutro';

/** El color de la variación. Depende del `sentido` de la métrica, no solo de la dirección. */
export function tonoVariacion(v: Variacion, sentido: Sentido): Tono {
  if (v.tipo === 'sin_base' || v.tipo === 'sin_cambio') return 'neutro';

  const sube = v.tipo === 'desde_cero' ? true : v.direccion === 'sube';
  const esBueno = sentido === 'mas_es_mejor' ? sube : !sube;
  return esBueno ? 'bueno' : 'malo';
}

/** El texto de la variación. Cada tipo dice explícitamente qué pasó. */
export function textoVariacion(v: Variacion): string {
  switch (v.tipo) {
    case 'sin_base':
      return 'sin comparación previa';
    case 'sin_cambio':
      return 'sin cambios vs. la semana anterior';
    case 'desde_cero':
      return `+${v.actual} vs. la semana anterior (antes 0)`;
    case 'delta': {
      const signo = v.puntos > 0 ? '+' : '−';
      return `${signo}${Math.abs(v.puntos)} (${signo}${Math.abs(v.porcentaje)}%) vs. la semana anterior`;
    }
  }
}
