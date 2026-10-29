/**
 * Las cuentas del morph del hero (las cards flotantes que se arman en el dashboard al
 * scrollear). Funciones puras: `MorphHero.tsx` mide el DOM y les pasa números.
 */

export interface Punto {
  x: number;
  y: number;
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ease in-out cúbico: arranca y frena suave. */
export const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Ease-out cúbico: casi todo el movimiento al principio, como el de la referencia. */
export const salida = (t: number) => 1 - (1 - t) ** 3;

/**
 * El avance de un elemento dentro de su propio tramo del scroll, ya suavizado.
 * Con `p <= desde` es 0 y con `p >= hasta` es 1: cada pieza entra y termina en su
 * momento (el titular se va temprano, las cards llegan hacia el 0.8).
 */
export function tramo(
  p: number,
  desde: number,
  hasta: number,
  curva: (t: number) => number = suave,
): number {
  if (hasta <= desde) return p >= hasta ? 1 : 0;
  return curva(clamp((p - desde) / (hasta - desde)));
}

/**
 * Un paso del "scrub" suave: el progreso que se pinta persigue al del scroll en vez de
 * saltar a él. Cerca del objetivo lo alcanza, así el loop de rAF puede terminar.
 */
export function acercar(actual: number, objetivo: number, factor = 0.15, umbral = 0.0005): number {
  const siguiente = actual + (objetivo - actual) * factor;
  return Math.abs(objetivo - siguiente) < umbral ? objetivo : siguiente;
}

/**
 * El progreso global [0, 1] del scroll dentro del wrapper alto. Sin recorrido (el
 * wrapper no es más alto que el viewport) no hay morph: queda el hero.
 */
export function progresoScroll(scrollY: number, inicio: number, recorrido: number): number {
  if (recorrido <= 0) return 0;
  return clamp((scrollY - inicio) / recorrido);
}

/**
 * Dónde y a qué escala va la ventana del dashboard dentro del escenario: centrada en
 * el espacio debajo del nav, lo más grande posible sin pasarse de los márgenes ni de 1.
 */
export function encajarVentana(
  escenario: { ancho: number; alto: number },
  ventana: { ancho: number; alto: number },
  margen: { arriba: number; abajo: number; lados: number },
): { escala: number; x: number; y: number } {
  const anchoLibre = escenario.ancho - 2 * margen.lados;
  const altoLibre = escenario.alto - margen.arriba - margen.abajo;
  const escala = Math.max(0, Math.min(anchoLibre / ventana.ancho, altoLibre / ventana.alto, 1));
  return {
    escala,
    x: (escenario.ancho - ventana.ancho * escala) / 2,
    y: margen.arriba + (altoLibre - ventana.alto * escala) / 2,
  };
}

/**
 * El desplazamiento que lleva una card desde su lugar en el hero (`origen`) hasta su
 * slot en la ventana. El slot se mide sin escalar dentro de la ventana, así que se
 * lleva al escenario con la escala y la posición de la ventana.
 */
export function deltaHaciaSlot(
  origen: Punto,
  slotEnVentana: Punto,
  ventana: { escala: number; x: number; y: number },
): Punto {
  return {
    x: ventana.x + slotEnVentana.x * ventana.escala - origen.x,
    y: ventana.y + slotEnVentana.y * ventana.escala - origen.y,
  };
}

/**
 * El `transform` de una card en el instante `t` (0 = hero, 1 = slot). Con
 * `transform-origin: 0 0` la escala es uniforme desde la esquina, que es justo el
 * punto que se lleva al slot: la card nunca se deforma.
 */
export function transformCard(delta: Punto, escalaFinal: number, t: number): string {
  const s = lerp(1, escalaFinal, t);
  return `translate3d(${delta.x * t}px, ${delta.y * t}px, 0) scale(${s})`;
}

/**
 * Cuántos viewports de scroll dura el pin (el wrapper mide `100vh + PIN_VH * 100vh`,
 * ver `.morph-envoltura` en `globals.css`). Los tramos se escriben en viewports de
 * scroll y se pasan a p ∈ [0, 1] con `enProgreso`: así alargar el pin para la etapa 2
 * no corre la etapa 1, que sigue terminando a la misma distancia en px.
 */
export const PIN_VH = 2.3;

/** Un tramo en viewports de scroll → el mismo tramo en p ∈ [0, 1] del pin. */
export function enProgreso(
  [desde, hasta]: readonly [number, number],
  pinVh = PIN_VH,
): [number, number] {
  return [desde / pinVh, hasta / pinVh];
}

/** El número de un contador que sube de 0 a `final` con el progreso `t`. */
export const contar = (final: number, t: number) => Math.round(final * clamp(t));
