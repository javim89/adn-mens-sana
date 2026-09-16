import { getSeriesColor } from '@/lib/insights/theme';
import type { ValueFormat } from '@/lib/insights/theme';
import type { CellValue, ColumnMeta, Row, VizConfig } from './types';

export function dimensionColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter((c) => c.role === 'dimension');
}

export function measureColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter((c) => c.role === 'measure');
}

export function findColumn(columns: ColumnMeta[], key: string | undefined | null): ColumnMeta | undefined {
  if (!key) return undefined;
  return columns.find((c) => c.id === key);
}

/** Eje de categorías: el override del config, si no la primera dimensión. */
export function resolveXColumn(columns: ColumnMeta[], config: VizConfig): ColumnMeta | undefined {
  return findColumn(columns, config.xKey) ?? dimensionColumns(columns)[0];
}

/** Series a graficar: el override del config, si no todas las medidas. */
export function resolveSeriesColumns(columns: ColumnMeta[], config: VizConfig): ColumnMeta[] {
  if (config.seriesKeys?.length) {
    return config.seriesKeys.map((k) => findColumn(columns, k)).filter((c): c is ColumnMeta => !!c);
  }
  return measureColumns(columns);
}

/** Dimensión que abre las series en barras agrupadas/apiladas. */
export function resolveBreakdownColumn(columns: ColumnMeta[], config: VizConfig): ColumnMeta | undefined {
  if (config.breakdownKey === null) return undefined;
  if (config.breakdownKey) return findColumn(columns, config.breakdownKey);
  const x = resolveXColumn(columns, config);
  return dimensionColumns(columns).find((c) => c.id !== x?.id);
}

// `timeZone: 'UTC'` es obligatorio: las fechas del motor son fechas de
// calendario (columnas `date` y `date_trunc`), que llegan como medianoche UTC.
// Formatearlas en la zona local (UTC-3) las correría un día para atrás, y un
// eje mensual mostraría "dic 2025" para el bucket de enero 2026.
const DATE_FULL = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const DATE_MONTH = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'UTC',
  month: 'short',
  year: 'numeric',
});

/**
 * Las fechas llegan ya truncadas por el `timeGrain` del QuerySpec, que no viaja
 * en el config. Si el valor cae en el día 1 a medianoche se asume grano mensual
 * o mayor y se muestra "ene 2026"; si no, la fecha completa.
 */
function formatDateCell(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const isMonthStart = d.getUTCDate() === 1 && d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
  return isMonthStart ? DATE_MONTH.format(d) : DATE_FULL.format(d);
}

/** Label visible de un valor de dimensión: enum → español, date → es-AR. */
export function formatCategory(value: CellValue, column?: ColumnMeta): string {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';

  const raw = String(value);
  if (column?.enumLabels?.[raw]) return column.enumLabels[raw];
  if (column?.type === 'date') return formatDateCell(raw);
  return raw;
}

export function toNumber(value: CellValue): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Formato numérico efectivo: el del config gana sobre el de la columna. */
export function resolveFormat(config: VizConfig, column?: ColumnMeta): ValueFormat {
  return config.numberFormat ?? column?.format ?? 'decimal';
}

export function colorFor(key: string, index: number, config: VizConfig): string {
  return config.colors?.[key] ?? getSeriesColor(key, index);
}

export interface PivotResult {
  /** Filas listas para recharts: `{ __x: label, [serie]: number }`. */
  rows: Array<Record<string, string | number>>;
  /** Keys de serie en orden de aparición. */
  seriesKeys: string[];
  /** Label visible de cada key de serie. */
  seriesLabels: Record<string, string>;
}

export const X_KEY = '__x';

/**
 * Arma el dataset de recharts. Con `breakdown` pivotea la segunda dimensión a
 * columnas (una serie por valor); sin `breakdown`, cada medida es una serie.
 */
export function buildChartData(
  data: Row[],
  xColumn: ColumnMeta | undefined,
  seriesColumns: ColumnMeta[],
  breakdownColumn?: ColumnMeta,
): PivotResult {
  const seriesLabels: Record<string, string> = {};

  if (breakdownColumn && seriesColumns.length > 0) {
    const measure = seriesColumns[0];
    const byX = new Map<string, Record<string, string | number>>();
    const seriesKeys: string[] = [];

    for (const row of data) {
      const xLabel = formatCategory(xColumn ? row[xColumn.id] : null, xColumn);
      let bucket = byX.get(xLabel);
      if (!bucket) {
        bucket = { [X_KEY]: xLabel };
        byX.set(xLabel, bucket);
      }
      const rawSeries = row[breakdownColumn.id];
      const seriesKey = rawSeries === null || rawSeries === undefined ? 'Sin dato' : String(rawSeries);
      if (!seriesKeys.includes(seriesKey)) {
        seriesKeys.push(seriesKey);
        seriesLabels[seriesKey] = formatCategory(rawSeries, breakdownColumn);
      }
      bucket[seriesKey] = toNumber(bucket[seriesKey] as CellValue) + toNumber(row[measure.id]);
    }

    // Recharts apila mal si una serie falta en una fila: se rellena con 0.
    const rows = [...byX.values()].map((r) => {
      const filled = { ...r };
      for (const k of seriesKeys) if (filled[k] === undefined) filled[k] = 0;
      return filled;
    });

    return { rows, seriesKeys, seriesLabels };
  }

  const seriesKeys = seriesColumns.map((c) => c.id);
  for (const c of seriesColumns) seriesLabels[c.id] = c.label;

  const rows = data.map((row) => {
    const out: Record<string, string | number> = {
      [X_KEY]: formatCategory(xColumn ? row[xColumn.id] : null, xColumn),
    };
    for (const c of seriesColumns) out[c.id] = toNumber(row[c.id]);
    return out;
  });

  return { rows, seriesKeys, seriesLabels };
}

/** Normaliza cada fila a 100% para la barra apilada porcentual. */
export function toPercentStack(
  rows: Array<Record<string, string | number>>,
  seriesKeys: string[],
): Array<Record<string, string | number>> {
  return rows.map((row) => {
    const total = seriesKeys.reduce((acc, k) => acc + toNumber(row[k] as CellValue), 0);
    const out: Record<string, string | number> = { [X_KEY]: row[X_KEY] };
    for (const k of seriesKeys) {
      out[k] = total === 0 ? 0 : (toNumber(row[k] as CellValue) / total) * 100;
    }
    return out;
  });
}
