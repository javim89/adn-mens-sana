/**
 * Proyección del catálogo para el cliente.
 *
 * El catálogo real (`catalog.ts`) lleva las expresiones SQL de cada dimensión y
 * medida. El constructor visual solo necesita ids, labels y tipos, así que se
 * exporta una versión sin `sql`/`from`/`joins`/`cte`: el bundle del browser no
 * se lleva la forma del schema ni los JOINs, y ningún componente de cliente
 * puede accidentalmente empezar a construir SQL por su cuenta.
 *
 * Es una derivación en tiempo de módulo del mismo catálogo, así que no puede
 * desincronizarse: agregar una dimensión allá la publica acá automáticamente.
 */

import { DATASETS } from './catalog';
import { isFormulaMeasure } from './types';
import type { FieldType, MeasureFormat, Operator } from './types';

export interface ClientDimension {
  id: string;
  label: string;
  type: FieldType;
  filterable: boolean;
  enumLabels?: Record<string, string>;
}

export interface ClientMeasure {
  id: string;
  label: string;
  format: MeasureFormat;
  /** `true` si es una medida derivada (el toggle "Fórmula" del editor). */
  isFormula: boolean;
}

export interface ClientDataset {
  id: string;
  label: string;
  description: string;
  grain: string;
  dimensions: ClientDimension[];
  measures: ClientMeasure[];
}

export const CLIENT_DATASETS: ClientDataset[] = DATASETS.map((dataset) => ({
  id: dataset.id,
  label: dataset.label,
  description: dataset.description,
  grain: dataset.grain,
  dimensions: dataset.dimensions.map((d) => ({
    id: d.id,
    label: d.label,
    type: d.type,
    filterable: d.filterable !== false,
    ...(d.enumLabels ? { enumLabels: d.enumLabels } : {}),
  })),
  measures: dataset.measures.map((m) => ({
    id: m.id,
    label: m.label,
    format: m.format,
    isFormula: isFormulaMeasure(m),
  })),
}));

export function getClientDataset(id: string | undefined | null): ClientDataset | undefined {
  if (!id) return undefined;
  return CLIENT_DATASETS.find((d) => d.id === id);
}

/**
 * Los operadores por tipo salen de `types.ts`, que es la misma tabla que usa el
 * compilador para validar. Se re-exporta para que los componentes del editor
 * importen todo lo suyo desde un único módulo.
 */
export { OPERATORS_BY_TYPE } from './types';

export const OPERATOR_LABELS: Record<Operator, string> = {
  eq: 'es igual a',
  ne: 'es distinto de',
  contains: 'contiene',
  starts_with: 'empieza con',
  in: 'es alguno de',
  not_in: 'no es ninguno de',
  lt: 'es menor que',
  lte: 'es menor o igual que',
  gt: 'es mayor que',
  gte: 'es mayor o igual que',
  between: 'está entre',
  last_n_days: 'en los últimos N días',
  this_month: 'este mes',
  last_month: 'el mes pasado',
  this_year: 'este año',
  is_true: 'es verdadero',
  is_false: 'es falso',
  is_null: 'está vacío',
  is_not_null: 'tiene dato',
};

/** Operadores que no llevan valor: el editor oculta el campo. */
export const VALUELESS_OPERATORS: Operator[] = [
  'is_null',
  'is_not_null',
  'is_true',
  'is_false',
  'this_month',
  'last_month',
  'this_year',
];

export const TIME_GRAIN_LABELS: Record<string, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  quarter: 'Trimestre',
  year: 'Año',
};
