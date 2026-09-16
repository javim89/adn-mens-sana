/**
 * Aplicación de los filtros de dashboard al QuerySpec de cada widget.
 *
 * Un filtro de dashboard es un control único que afecta a varios widgets a la
 * vez. Se resuelve en el cliente inyectando una condición en el `QuerySpec`
 * antes de mandarlo a la API; el servidor lo valida como cualquier otro spec,
 * así que esto no abre ningún camino nuevo: un filtro con un campo que no
 * existe en el dataset del widget simplemente no se aplica.
 */

import type {
  FilterCondition,
  FilterGroup,
  InsightsSpec,
  Operator,
} from './types';

export interface ActiveDashboardFilter {
  id: string;
  dataset: string;
  dimension: string;
  operator: string;
  /** `undefined`/`null`/`[]` = sin valor elegido: el filtro no se aplica. */
  value: unknown;
  widgetIds: string[];
}

/** Operadores que se aplican aunque no tengan valor (son autosuficientes). */
const VALUELESS: Operator[] = [
  'is_null',
  'is_not_null',
  'is_true',
  'is_false',
  'this_month',
  'last_month',
  'this_year',
];

function hasValue(filter: ActiveDashboardFilter): boolean {
  if (VALUELESS.includes(filter.operator as Operator)) return true;
  const { value } = filter;
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Devuelve el spec del widget con los filtros del dashboard incorporados.
 *
 * Se descartan los filtros que:
 * - no apuntan a este widget,
 * - no tienen valor elegido,
 * - o pertenecen a otro dataset (un filtro de "disciplina" sobre Deportistas no
 *   puede aplicarse a un widget de Turnos aunque el nombre coincida).
 *
 * Los filtros del dashboard se combinan con AND contra los del propio widget,
 * que es lo que espera quien usa el control: acotar, no reemplazar.
 */
export function applyDashboardFilters(
  spec: InsightsSpec,
  widgetId: string,
  filters: ActiveDashboardFilter[],
): InsightsSpec {
  // En modo SQL crudo no hay dataset ni dimensiones contra las cuales resolver.
  if (spec.mode !== 'builder') return spec;

  const aplicables = filters.filter(
    (f) => f.widgetIds.includes(widgetId) && f.dataset === spec.dataset && hasValue(f),
  );

  if (aplicables.length === 0) return spec;

  const condiciones: FilterCondition[] = aplicables.map((f) => ({
    field: f.dimension,
    operator: f.operator as Operator,
    value: f.value,
  }));

  const propios = spec.filters;
  const combinado: FilterGroup = {
    op: 'all',
    children: propios ? [propios, ...condiciones] : condiciones,
  };

  return { ...spec, filters: combinado };
}
