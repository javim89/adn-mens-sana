/**
 * Detección de los colores de un logo. Función pura sobre píxeles RGBA: en el
 * navegador la alimenta un canvas chico (`imagen-logo.ts`) y en los tests, sharp.
 *
 * Trabaja en OKLab porque ahí la distancia euclídea se parece a la diferencia que ve
 * el ojo: agrupar con un umbral fijo junta los bordes suavizados con su color y no
 * mezcla dos colores de marca distintos.
 */
import { asegurarContraste, oklabAOklch, rgbAHex, oklabARgb, rgbAOklab, type Oklab } from './colores';
import { BLANCO, CONTRASTE_MIN_TEXTO } from './tokens';

export interface PaletaDetectada {
  /** El más oscuro de los dos colores principales, con ≥4.5:1 contra blanco. */
  primario: string;
  /** El otro color principal (≥4.5:1 contra blanco), o `null` si el logo tiene uno solo. */
  secundario: string | null;
  /** El tercer color, tal cual (el acento no lleva texto blanco encima). */
  acento: string | null;
  /** Hasta 5 colores distintos del logo, sin ajustar, del más al menos representativo. */
  candidatos: string[];
  /** Los roles que se oscurecieron para llegar al contraste mínimo. */
  ajustados: ('primario' | 'secundario')[];
}

// Píxeles que no dicen nada de la marca: fondo, contornos y grises.
const ALFA_MIN = 128;
const L_MAX = 0.93;
const L_MIN = 0.15;
const CROMA_MIN = 0.04;

/** Lado de cada celda del histograma en OKLab. */
const PASO_GRILLA = 0.03;
/** Dos celdas a menos de esta distancia son el mismo color (bordes suavizados, compresión). */
const DELTA_E_CLUSTER = 0.08;
/** Un cluster con menos de esta fracción de los píxeles útiles es ruido. */
const POBLACION_MIN = 0.01;
/** Dos candidatos son distintos si sus tonos se separan esto… */
const DELTA_TONO_MIN = 30;
/** …o si están así de lejos en OKLab (mismo tono, claridad muy distinta). */
const DELTA_E_DISTINTO = 0.15;
const MAX_CANDIDATOS = 5;

interface Cluster {
  n: number;
  l: number;
  a: number;
  b: number;
}

function distancia(x: Oklab, y: Oklab): number {
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

function deltaTono(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

/** Histograma en una grilla OKLab con los píxeles útiles. */
function histograma(rgba: ArrayLike<number>, ancho: number, alto: number): { celdas: Cluster[]; total: number } {
  const celdas = new Map<string, Cluster>();
  const cache = new Map<number, Oklab | null>();
  let total = 0;
  const px = Math.min(ancho * alto, Math.floor(rgba.length / 4));

  for (let i = 0; i < px; i++) {
    const o = i * 4;
    if (rgba[o + 3] < ALFA_MIN) continue;
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    const clave = (r << 16) | (g << 8) | b;
    let lab = cache.get(clave);
    if (lab === undefined) {
      const c = rgbAOklab({ r, g, b });
      const { l, c: croma } = oklabAOklch(c);
      lab = l > L_MAX || l < L_MIN || croma < CROMA_MIN ? null : c;
      cache.set(clave, lab);
    }
    if (!lab) continue;
    total++;
    const k = `${Math.round(lab.l / PASO_GRILLA)},${Math.round(lab.a / PASO_GRILLA)},${Math.round(lab.b / PASO_GRILLA)}`;
    const celda = celdas.get(k);
    if (celda) {
      celda.n++;
      celda.l += lab.l;
      celda.a += lab.a;
      celda.b += lab.b;
    } else {
      celdas.set(k, { n: 1, l: lab.l, a: lab.a, b: lab.b });
    }
  }

  // Sumas → promedios.
  const lista = [...celdas.values()].map((c) => ({ n: c.n, l: c.l / c.n, a: c.a / c.n, b: c.b / c.n }));
  return { celdas: lista, total };
}

/** Agrupa las celdas, de la más poblada a la menos, en clusters con ΔE < umbral. */
function agrupar(celdas: Cluster[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const celda of [...celdas].sort((x, y) => y.n - x.n)) {
    const destino = clusters.find((c) => distancia(c, celda) < DELTA_E_CLUSTER);
    if (!destino) {
      clusters.push({ ...celda });
      continue;
    }
    const n = destino.n + celda.n;
    destino.l = (destino.l * destino.n + celda.l * celda.n) / n;
    destino.a = (destino.a * destino.n + celda.a * celda.n) / n;
    destino.b = (destino.b * destino.n + celda.b * celda.n) / n;
    destino.n = n;
  }
  return clusters;
}

/**
 * Los colores de marca de un logo: primario, secundario y acento listos para el tema,
 * más hasta 5 candidatos para elegir a mano.
 *
 * 1. Descarta píxeles transparentes, casi blancos, casi negros y grises.
 * 2. Histograma en grilla OKLab → clusters con ΔE < 0.08.
 * 3. Puntaje = población × croma; se toman candidatos distintos entre sí
 *    (Δtono ≥ 30° o ΔE ≥ 0.15).
 * 4. De los dos primeros, el más oscuro es el primario y el otro el secundario; el
 *    tercero es el acento. Primario y secundario se oscurecen hasta 4.5:1 con blanco.
 *
 * `null` si el logo es monocromo (blanco, negro o grises): no hay color que proponer.
 */
export function extraerPaleta(rgba: ArrayLike<number>, ancho: number, alto: number): PaletaDetectada | null {
  const { celdas, total } = histograma(rgba, ancho, alto);
  if (total === 0) return null;

  const minimo = Math.max(1, total * POBLACION_MIN);
  const puntuados = agrupar(celdas)
    .filter((c) => c.n >= minimo)
    .map((c) => {
      const lch = oklabAOklch(c);
      return { lab: c as Oklab, lch, puntaje: c.n * lch.c };
    })
    .sort((x, y) => y.puntaje - x.puntaje);

  const elegidos: typeof puntuados = [];
  for (const c of puntuados) {
    const distinto = elegidos.every(
      (e) => deltaTono(e.lch.h, c.lch.h) >= DELTA_TONO_MIN || distancia(e.lab, c.lab) >= DELTA_E_DISTINTO,
    );
    if (distinto) elegidos.push(c);
    if (elegidos.length === MAX_CANDIDATOS) break;
  }
  if (elegidos.length === 0) return null;

  const candidatos = elegidos.map((e) => rgbAHex(oklabARgb(e.lab)));
  const [a, b] = elegidos;
  // El más oscuro de los dos principales va de primario: es el que mejor aguanta texto blanco.
  const [iPrimario, iSecundario] = b && b.lch.l < a.lch.l ? [1, 0] : [0, 1];

  const ajustados: PaletaDetectada['ajustados'] = [];
  const conContraste = (hex: string, rol: 'primario' | 'secundario') => {
    const ajustado = asegurarContraste(hex, BLANCO, CONTRASTE_MIN_TEXTO);
    if (ajustado !== hex) ajustados.push(rol);
    return ajustado;
  };

  return {
    primario: conContraste(candidatos[iPrimario], 'primario'),
    secundario: candidatos[iSecundario] ? conContraste(candidatos[iSecundario], 'secundario') : null,
    acento: candidatos[2] ?? null,
    candidatos,
    ajustados,
  };
}
