/**
 * Valores de color de la app.
 *
 * Es el ÚNICO archivo TS fuera de la landing que puede tener hex (lo controla
 * `__tests__/sin-hex.test.ts`). El CSS los repite solo en el bloque
 * `tokens:start … tokens:end` de `app/globals.css`, y `globals-css.test.ts` fija que
 * esos defaults sean iguales a `TEMA_BIOTEAM`.
 *
 * Todos los hex van en minúscula y con 6 dígitos (el formato que valida `esHex6`).
 */

/** Los colores del club que llegan al CSS como `--club-*`. */
export interface Tema {
  primario: string;
  primarioHover: string;
  primarioForeground: string;
  primarioSuave: string;
  secundario: string;
  secundarioForeground: string;
  acento: string;
  acentoForeground: string;
  acentoSuave: string;
}

/** Variable CSS de cada color del tema. */
export const VARS_TEMA: Record<keyof Tema, `--club-${string}`> = {
  primario: '--club-primario',
  primarioHover: '--club-primario-hover',
  primarioForeground: '--club-primario-foreground',
  primarioSuave: '--club-primario-suave',
  secundario: '--club-secundario',
  secundarioForeground: '--club-secundario-foreground',
  acento: '--club-acento',
  acentoForeground: '--club-acento-foreground',
  acentoSuave: '--club-acento-suave',
};

export const BLANCO = '#ffffff';
/** El texto oscuro de la app (`--foreground`). */
export const TEXTO_OSCURO = '#1c1c1c';

/** La paleta navy/azul/dorado: el tema default (landing, superadmin y clubes sin colores). */
export const TEMA_BIOTEAM: Tema = {
  primario: '#121a61',
  primarioHover: '#1e2a8a',
  primarioForeground: BLANCO,
  primarioSuave: '#eef0fb',
  secundario: '#3346cc',
  secundarioForeground: BLANCO,
  acento: '#c9a84c',
  acentoForeground: TEXTO_OSCURO,
  acentoSuave: '#eaddb5',
};

/** Tema sin marca (login genérico, `/bienvenida`): grises. */
export const TEMA_NEUTRO: Tema = {
  primario: '#1f2937',
  primarioHover: '#374151',
  primarioForeground: BLANCO,
  primarioSuave: '#f3f4f6',
  secundario: '#4b5563',
  secundarioForeground: BLANCO,
  acento: '#6b7280',
  acentoForeground: BLANCO,
  acentoSuave: '#e5e7eb',
};

/** Contraste mínimo de texto normal (WCAG AA). Primario y secundario lo cumplen contra blanco. */
export const CONTRASTE_MIN_TEXTO = 4.5;

// ---------------------------------------------------------------------------
// Estados fijos para gráficos (Recharts no lee clases de Tailwind). Son los mismos
// tonos de la paleta Tailwind que usan los badges y tablas de cada estado.
// ---------------------------------------------------------------------------

/** Mismos niveles que `NIVEL_TRIAGE_META` en TriagePanel.tsx. */
export const COLORES_TRIAGE: Record<string, string> = {
  VERDE: '#16a34a', // green-600
  AMARILLO: '#eab308', // yellow-500
  NARANJA: '#f97316', // orange-500
  ROJO: '#dc2626', // red-600
};

/** Equivalente hex del texto de `ESTADO_BADGE` en DeportistasTable.tsx. */
export const COLORES_ESTADO_DEPORTISTA: Record<string, string> = {
  ACTIVO: '#15803d', // green-700
  INACTIVO: '#6b7280', // gray-500
  LESIONADO: '#b45309', // amber-700
  SUSPENDIDO: '#b91c1c', // red-700
};

/** Equivalente hex de `ESTADO_ASISTENCIA_STYLES` en lib/utils/asistencia.ts. */
export const COLORES_ESTADO_ASISTENCIA: Record<string, string> = {
  PRESENTE: '#15803d', // green-700
  AUSENTE: '#b91c1c', // red-700
  LLEGO_TARDE: '#b45309', // amber-700
  SE_RETIRO_ANTES: '#6b7280', // gray-500
};

/** Grises fijos de las series de Insights que no son del club. */
export const GRISES_SERIES = ['#4b5563', '#9ca3af'] as const; // gray-600, gray-400
