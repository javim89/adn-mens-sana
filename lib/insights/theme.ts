/**
 * Paleta y formateo de los charts de Insights.
 *
 * Las series por defecto derivan de la paleta del club (DESIGN.md) para que los
 * gráficos no parezcan de otra app. Donde el dato ya tiene un color asignado en
 * la UI existente (triage, estado de deportista, estado de asistencia) se usa
 * una escala semántica fija, para no contradecir las tablas y badges vigentes.
 */

/** Orden fijo: se rota por índice de serie cuando no hay escala semántica. */
export const SERIES_COLORS = [
  '#121A61', // navy
  '#3346CC', // accent
  '#C9A84C', // gold
  '#1E2A8A', // navy hover
  '#6B8AE6',
  '#8C6D1F',
  '#4B5563',
  '#9CA3AF',
] as const;

/** Mismos niveles que `NIVEL_TRIAGE_META` en TriagePanel.tsx. */
export const TRIAGE_COLORS: Record<string, string> = {
  VERDE: '#16a34a',
  AMARILLO: '#eab308',
  NARANJA: '#f97316',
  ROJO: '#dc2626',
};

/** Equivalente hex del texto de `ESTADO_BADGE` en DeportistasTable.tsx. */
export const ESTADO_DEPORTISTA_COLORS: Record<string, string> = {
  ACTIVO: '#15803d', // green-700
  INACTIVO: '#6B7280',
  LESIONADO: '#b45309', // amber-700
  SUSPENDIDO: '#b91c1c', // red-700
};

/** Equivalente hex de `ESTADO_ASISTENCIA_STYLES` en lib/utils/asistencia.ts. */
export const ESTADO_ASISTENCIA_COLORS: Record<string, string> = {
  PRESENTE: '#15803d', // green-700
  AUSENTE: '#b91c1c', // red-700
  LLEGO_TARDE: '#b45309', // amber-700
  SE_RETIRO_ANTES: '#6B7280',
};

const SEMANTIC_COLORS: Record<string, string> = {
  ...TRIAGE_COLORS,
  ...ESTADO_DEPORTISTA_COLORS,
  ...ESTADO_ASISTENCIA_COLORS,
};

/**
 * Color de una serie o categoría. Si la key coincide con un valor de enum que
 * ya tiene color propio en la app, gana la escala semántica; si no, se rota la
 * paleta del club por posición.
 */
export function getSeriesColor(key: string, index: number): string {
  const semantic = SEMANTIC_COLORS[key];
  if (semantic) return semantic;
  return SERIES_COLORS[((index % SERIES_COLORS.length) + SERIES_COLORS.length) % SERIES_COLORS.length];
}

/** True si la key tiene color semántico propio (el editor lo usa para bloquear el picker). */
export function hasSemanticColor(key: string): boolean {
  return key in SEMANTIC_COLORS;
}

export type ValueFormat = 'integer' | 'decimal' | 'percent';

const FORMATTERS: Record<ValueFormat, Intl.NumberFormat> = {
  integer: new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }),
  decimal: new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }),
  percent: new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }),
};

/**
 * Formatea un valor numérico en es-AR. `percent` asume que el valor ya viene en
 * escala 0–100 (así lo emiten las medidas fórmula del catálogo) y solo agrega
 * el signo.
 */
export function formatValue(v: unknown, format: ValueFormat = 'decimal'): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);

  const formatted = FORMATTERS[format].format(n);
  return format === 'percent' ? `${formatted}%` : formatted;
}

/** Versión compacta para KPIs grandes: 12.4 k, 3,1 M. */
export function formatCompact(v: unknown, format: ValueFormat = 'integer'): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return formatValue(v, format);
  if (format !== 'percent' && Math.abs(n) >= 100_000) {
    return new Intl.NumberFormat('es-AR', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return formatValue(n, format);
}

/** Tokens compartidos por los ejes/grillas de recharts. */
export const CHART_TOKENS = {
  grid: '#F3F4F6',
  axis: '#E5E7EB',
  axisText: '#6B7280',
  axisFontSize: 11,
  tooltipBorder: '#F3F4F6',
  /** Resalte de la barra/columna bajo el cursor. Azul del club muy diluido. */
  cursor: 'rgba(51, 70, 204, 0.06)',
} as const;
