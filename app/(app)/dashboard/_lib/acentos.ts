/**
 * El color de cada módulo del dashboard, en un solo lugar.
 *
 * **Las clases van LITERALES Y COMPLETAS a propósito.** Tailwind v4 escanea el código
 * buscando strings de clase; una clase armada por concatenación (`bg-${color}-600`)
 * no aparece nunca entera en el fuente y no se genera. Por eso cada variante está
 * escrita a mano en vez de derivarse de un nombre de color.
 *
 * El dorado de Calendario es el único uso del acento del escudo en el dashboard: el
 * DESIGN.md lo permite "con moderación", y un borde superior lo es.
 */
export type ModuloDashboard =
  | 'triage'
  | 'viandas'
  | 'turnos'
  | 'presentismo'
  | 'seguimientos'
  | 'plantel'
  | 'eventos';

export interface Acento {
  /** El cuadradito del encabezado de bloque. */
  cuadrado: string;
  /** El borde grueso de arriba de la card blanca del módulo. */
  bordeSuperior: string;
  /** La barra destacada (la máxima) de un gráfico de barras. */
  barraFuerte: string;
  /** El resto de las barras. */
  barraSuave: string;
  /** El bloque de fecha de un tile. */
  tileFecha: string;
  /** El link al pie de la card. */
  link: string;
}

export const ACENTOS: Record<ModuloDashboard, Acento> = {
  triage: {
    cuadrado: 'bg-red-600',
    bordeSuperior: 'border-t-4 border-t-red-600',
    barraFuerte: 'bg-red-600',
    barraSuave: 'bg-red-200',
    tileFecha: 'bg-red-600',
    link: 'text-red-700 hover:text-red-900',
  },
  viandas: {
    cuadrado: 'bg-indigo-600',
    bordeSuperior: 'border-t-4 border-t-indigo-600',
    barraFuerte: 'bg-indigo-600',
    barraSuave: 'bg-indigo-200',
    tileFecha: 'bg-indigo-600',
    link: 'text-indigo-700 hover:text-indigo-900',
  },
  turnos: {
    cuadrado: 'bg-emerald-600',
    bordeSuperior: 'border-t-4 border-t-emerald-600',
    barraFuerte: 'bg-emerald-600',
    barraSuave: 'bg-emerald-200',
    tileFecha: 'bg-emerald-600',
    link: 'text-emerald-700 hover:text-emerald-900',
  },
  presentismo: {
    cuadrado: 'bg-teal-600',
    bordeSuperior: 'border-t-4 border-t-teal-600',
    barraFuerte: 'bg-teal-600',
    barraSuave: 'bg-teal-200',
    tileFecha: 'bg-teal-600',
    link: 'text-teal-700 hover:text-teal-900',
  },
  seguimientos: {
    cuadrado: 'bg-violet-600',
    bordeSuperior: 'border-t-4 border-t-violet-600',
    barraFuerte: 'bg-violet-600',
    barraSuave: 'bg-violet-200',
    tileFecha: 'bg-violet-600',
    link: 'text-violet-700 hover:text-violet-900',
  },
  plantel: {
    cuadrado: 'bg-sky-600',
    bordeSuperior: 'border-t-4 border-t-sky-600',
    barraFuerte: 'bg-sky-600',
    barraSuave: 'bg-sky-200',
    tileFecha: 'bg-sky-600',
    link: 'text-sky-700 hover:text-sky-900',
  },
  eventos: {
    cuadrado: 'bg-[#C9A84C]',
    bordeSuperior: 'border-t-4 border-t-[#C9A84C]',
    barraFuerte: 'bg-[#C9A84C]',
    barraSuave: 'bg-[#EADDB5]',
    tileFecha: 'bg-[#121A61]',
    link: 'text-[#3346CC] hover:text-[#121A61]',
  },
};

/** Variantes de card destacada. Texto en tonos 700–900 sobre tintados (contraste AA). */
export const HERO = {
  card: 'bg-[#121A61] text-white',
  label: 'text-white/80',
  valor: 'text-white',
  detalle: 'text-white/70',
  link: 'text-white hover:text-white/80',
} as const;

export const ALERTA_AMBAR = {
  card: 'bg-amber-50 border border-amber-100 border-t-4 border-t-amber-400',
  label: 'text-amber-900',
  valor: 'text-amber-900',
  detalle: 'text-amber-900',
  link: 'text-amber-900 hover:text-amber-950',
  badge: 'bg-amber-200 text-amber-900',
  bordeSuperior: 'border-t-4 border-t-amber-400',
} as const;

export const ALERTA_ROSA = {
  card: 'bg-rose-50 border border-rose-100 border-t-4 border-t-rose-500',
  label: 'text-rose-900',
  valor: 'text-rose-900',
  detalle: 'text-rose-900',
  link: 'text-rose-900 hover:text-rose-950',
  badge: 'bg-rose-200 text-rose-900',
  bordeSuperior: 'border-t-4 border-t-rose-500',
} as const;

/**
 * Una card blanca sobre el fondo blanco de la página. El fondo se mantiene blanco
 * (decisión del usuario), así que la card se despega con el borde gris + la sombra;
 * el borde superior de color del módulo se suma encima.
 */
export const CARD_BASE = 'bg-white rounded-2xl shadow-sm border border-gray-100';

/** Fuente de los números y títulos, como el resto del dashboard. */
export const OSWALD = { fontFamily: 'Oswald, sans-serif' } as const;
