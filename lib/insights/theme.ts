/**
 * Paleta y formateo de los charts de Insights.
 *
 * Las series por defecto derivan de la paleta del club (DESIGN.md) para que los
 * gráficos no parezcan de otra app. Donde el dato ya tiene un color asignado en
 * la UI existente (triage, estado de deportista, estado de asistencia) se usa
 * una escala semántica fija, para no contradecir las tablas y badges vigentes.
 * Los hex de esas escalas viven en `lib/branding/tokens.ts`.
 */
import {
  COLORES_ESTADO_ASISTENCIA,
  COLORES_ESTADO_DEPORTISTA,
  COLORES_TRIAGE,
  GRISES_SERIES,
} from '@/lib/branding/tokens';

/**
 * Orden fijo: se rota por índice de serie cuando no hay escala semántica. Son vars del
 * tema (`var(--club-*)`), así los gráficos siguen los colores del club: recharts pasa
 * el string tal cual a `fill`/`stroke`, y los navegadores resuelven `var()` y
 * `color-mix()` en los atributos de presentación de SVG (verificado en Chromium,
 * WebKit y Firefox).
 */
export const SERIES_COLORS = [
  'var(--club-primario)',
  'var(--club-secundario)',
  'var(--club-acento)',
  'var(--club-primario-hover)',
  'color-mix(in oklab, var(--club-secundario) 67%, white)', // secundario claro
  'color-mix(in srgb, var(--club-acento) 70%, black)', // acento oscuro
  ...GRISES_SERIES,
] as const;

export const TRIAGE_COLORS = COLORES_TRIAGE;
export const ESTADO_DEPORTISTA_COLORS = COLORES_ESTADO_DEPORTISTA;
export const ESTADO_ASISTENCIA_COLORS = COLORES_ESTADO_ASISTENCIA;

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

/** Tokens compartidos por los ejes/grillas de recharts (vars de `app/globals.css`). */
export const CHART_TOKENS = {
  grid: 'var(--muted)',
  axis: 'var(--border)',
  axisText: 'var(--muted-foreground)',
  axisFontSize: 11,
  tooltipBorder: 'var(--muted)',
  /** Resalte de la barra/columna bajo el cursor. Secundario del club muy diluido. */
  cursor: 'color-mix(in srgb, var(--club-secundario) 6%, transparent)',
} as const;
