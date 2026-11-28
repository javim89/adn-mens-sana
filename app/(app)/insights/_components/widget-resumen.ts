import { formatValue, type ValueFormat } from '@/lib/insights/theme';
import { isFilterGroup } from '@/lib/insights/types';
import type {
  FilterCondition,
  FilterGroup,
  InsightsSpec,
  TimeGrain,
} from '@/lib/insights/types';
import { dimensionColumns, resolveFormat, resolveSeriesColumns, toNumber } from './charts/helpers';
import type { ColumnMeta, Row, VizConfig } from './charts/types';

const MEJOR_LABEL: Record<TimeGrain, string> = {
  day: 'Mejor día',
  week: 'Mejor semana',
  month: 'Mejor mes',
  quarter: 'Mejor trimestre',
  year: 'Mejor año',
};

export interface ResumenSerie {
  promedio: string;
  mejorLabel: string;
  mejor: string;
  variacion: string;
}

/** Signo explícito: "+3", "−2". En porcentajes la variación va en puntos ("+4,0 pts"). */
export function formatearDelta(delta: number, format: ValueFormat): string {
  const signo = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const abs = Math.abs(delta);
  return format === 'percent'
    ? `${signo}${formatValue(abs, 'percent').replace('%', '')} pts`
    : `${signo}${formatValue(abs, format)}`;
}

/**
 * Las mini tarjetas Promedio / Mejor período / Variación de un widget de línea.
 * Solo tienen sentido con una serie por período (una dimensión, la de fecha) y al
 * menos dos puntos; si no, `null`. La variación es último contra primer punto.
 */
export function resumenSerie(
  data: Row[],
  columns: ColumnMeta[],
  config: VizConfig,
  timeGrain?: TimeGrain,
): ResumenSerie | null {
  if (data.length < 2 || dimensionColumns(columns).length !== 1) return null;
  const serie = resolveSeriesColumns(columns, config)[0];
  if (!serie) return null;

  const valores = data.map((r) => toNumber(r[serie.id]));
  const format = resolveFormat(config, serie);
  const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;

  return {
    promedio: formatValue(promedio, format),
    mejorLabel: timeGrain ? MEJOR_LABEL[timeGrain] : 'Máximo',
    mejor: formatValue(Math.max(...valores), format),
    variacion: formatearDelta(valores[valores.length - 1] - valores[0], format),
  };
}

const DIA_MS = 86_400_000;

function claveUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * El mismo filtro de fecha relativo, corrido al período anterior. `null` si no se
 * puede expresar con los operadores del motor.
 */
function condicionAnterior(c: FilterCondition, now: Date): FilterCondition | null {
  if (c.operator === 'this_month') return { field: c.field, operator: 'last_month' };
  if (c.operator === 'last_n_days') {
    const n = Number(c.value);
    if (!Number.isInteger(n) || n < 1) return null;
    // `last_n_days` cubre [hoy − n + 1, hoy]; el anterior es [hoy − 2n + 1, hoy − n].
    const hoy = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const desde = claveUtc(new Date(hoy - (2 * n - 1) * DIA_MS));
    const hasta = `${claveUtc(new Date(hoy - n * DIA_MS))}T23:59:59.999Z`;
    return { field: c.field, operator: 'between', value: [desde, hasta] };
  }
  return null;
}

/**
 * Spec del período anterior para la variación de un KPI: reemplaza los filtros de
 * fecha relativos ("este mes", "últimos N días") de los grupos `all` por su período
 * anterior. Sin ninguno que reemplazar (o en modo SQL) devuelve `null`: no hay
 * contra qué comparar.
 */
export function specPeriodoAnterior(spec: InsightsSpec, now: Date = new Date()): InsightsSpec | null {
  if (spec.mode !== 'builder' || !spec.filters) return null;
  let reemplazos = 0;

  const recorrer = (grupo: FilterGroup): FilterGroup => {
    if (grupo.op !== 'all') return grupo;
    return {
      ...grupo,
      children: grupo.children.map((nodo) => {
        if (isFilterGroup(nodo)) return recorrer(nodo);
        const anterior = condicionAnterior(nodo, now);
        if (!anterior) return nodo;
        reemplazos += 1;
        return anterior;
      }),
    };
  };

  const filters = recorrer(spec.filters);
  return reemplazos > 0 ? { ...spec, filters } : null;
}
