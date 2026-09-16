import type { VizId } from '@/lib/insights/visualizations';
import type { ValueFormat } from '@/lib/insights/theme';
import type { ColumnMeta, Row } from '@/lib/insights/types';

/**
 * Contrato que consumen los charts.
 *
 * `Row`, `CellValue`, `FieldType` y `ColumnMeta` son exactamente lo que devuelve
 * `POST /api/insights/query`, así que se re-exportan del motor en lugar de
 * duplicarse: una sola definición evita que las dos mitades se desincronicen.
 * Las columnas se indexan por `id` (el alias del SELECT que emite el compilador).
 */

export type {
  CellValue,
  Row,
  FieldType,
  ColumnMeta,
} from '@/lib/insights/types';

/** Lo que persiste el widget en `viz_config`. Todo opcional salvo el tipo. */
export interface VizConfig {
  type: VizId;
  /** Override del eje de categorías. Por defecto, la primera dimensión. */
  xKey?: string;
  /** Override de las series a graficar. Por defecto, todas las medidas. */
  seriesKeys?: string[];
  /** Segunda dimensión que abre las series (barra agrupada/apilada). */
  breakdownKey?: string | null;
  /** Override de color por serie o por categoría. */
  colors?: Record<string, string>;
  showLegend?: boolean;
  showGrid?: boolean;
  showDataLabels?: boolean;
  xAxisTitle?: string;
  yAxisTitle?: string;
  /** `horizontal` = barras acostadas. */
  orientation?: 'vertical' | 'horizontal';
  numberFormat?: ValueFormat;
  /** KPI: texto bajo el número. Por defecto, el label de la medida. */
  label?: string;
  /** Progreso: objetivo contra el que se mide. */
  target?: number;
  /** Comparación: qué medida se toma como referencia (por defecto, la segunda). */
  baselineKey?: string;
  /** Comparación: true si un delta negativo es lo deseable (ej. ausencias). */
  invertDelta?: boolean;
}

export interface ChartProps {
  data: Row[];
  config: VizConfig;
  columns: ColumnMeta[];
}
