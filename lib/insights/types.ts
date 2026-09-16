/**
 * Tipos de la capa semántica de Insights.
 *
 * Contrato de seguridad que atraviesa todo el módulo: lo único que se interpola
 * en el SQL son strings que provienen del catálogo (código del repo). Todo lo
 * que llega del cliente es un `id` que se usa como clave de lookup, o un valor
 * que viaja como parámetro `$n`.
 */

export type FieldType = 'string' | 'enum' | 'number' | 'date' | 'boolean';

export type Aggregation =
  | 'count'
  | 'count_distinct'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max';

export type MeasureFormat = 'integer' | 'decimal' | 'percent';

export interface Dimension {
  id: string;
  label: string;
  /** Expresión SQL literal del catálogo. NUNCA input del usuario. */
  sql: string;
  type: FieldType;
  enumLabels?: Record<string, string>;
  /** default true */
  filterable?: boolean;
}

export interface Measure {
  id: string;
  label: string;
  agg: Aggregation;
  /** Expresión a agregar: '*', 'deportistas.id', 'seguimientos_antropometria.peso'. */
  sql: string;
  /** Condición literal del catálogo → `FILTER (WHERE …)`. */
  filterSql?: string;
  format: MeasureFormat;
}

export interface FormulaMeasure {
  id: string;
  label: string;
  /** Aritmética sobre ids de `operands`: 'presentes / registros * 100'. */
  formula: string;
  /** ids de `Measure` (no de fórmula) del mismo dataset. */
  operands: string[];
  format: MeasureFormat;
}

export type AnyMeasure = Measure | FormulaMeasure;

export function isFormulaMeasure(m: AnyMeasure): m is FormulaMeasure {
  return 'formula' in m;
}

export interface Dataset {
  id: string;
  label: string;
  description: string;
  /** CTE literal que precede al SELECT, si el dataset lo necesita. */
  cte?: string;
  /** Tabla base (el alias es el propio nombre físico). */
  from: string;
  /** JOINs fijos, literales. */
  joins: string[];
  /** Qué representa una fila. Documentación para el usuario. */
  grain: string;
  dimensions: Dimension[];
  measures: AnyMeasure[];
}

// ---------------------------------------------------------------------------
// QuerySpec
// ---------------------------------------------------------------------------

export type TimeGrain = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type SortDirection = 'asc' | 'desc';

export type Operator =
  | 'eq'
  | 'ne'
  | 'contains'
  | 'starts_with'
  | 'in'
  | 'not_in'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'between'
  | 'last_n_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'is_true'
  | 'is_false'
  | 'is_null'
  | 'is_not_null';

export interface FilterCondition {
  field: string;
  operator: Operator;
  value?: unknown;
}

export interface FilterGroup {
  op: 'all' | 'any';
  children: (FilterGroup | FilterCondition)[];
}

export function isFilterGroup(
  node: FilterGroup | FilterCondition,
): node is FilterGroup {
  return 'children' in node;
}

export interface SortSpec {
  field: string;
  direction: SortDirection;
}

export interface QuerySpec {
  mode: 'builder';
  dataset: string;
  dimensions: string[];
  measures: string[];
  filters?: FilterGroup;
  timeGrain?: TimeGrain;
  /** A qué dimensión `date` se le aplica el grain. */
  timeDimension?: string;
  sort?: SortSpec[];
  /** Clampeado a [1, 1000]. */
  limit?: number;
}

export interface RawSqlSpec {
  mode: 'sql';
  sql: string;
}

export type InsightsSpec = QuerySpec | RawSqlSpec;

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

export interface ColumnMeta {
  /** Alias del SELECT. Las filas del resultado se indexan por este valor. */
  id: string;
  label: string;
  type: FieldType;
  role: 'dimension' | 'measure';
  /** Solo medidas. */
  format?: MeasureFormat;
  /**
   * Solo dimensiones `enum`: valor crudo → label en español. Viaja con la
   * columna para que los charts puedan rotular ejes y leyendas sin volver a
   * consultar el catálogo (que es código de servidor).
   */
  enumLabels?: Record<string, string>;
}

/** Una fila del resultado, indexada por el `id` de cada columna. */
export type CellValue = string | number | boolean | null;
export type Row = Record<string, CellValue>;

export interface CompiledQuery {
  sql: string;
  params: unknown[];
  columns: ColumnMeta[];
}

export interface QueryResult {
  columns: ColumnMeta[];
  rows: Record<string, unknown>[];
}

/**
 * Operadores admitidos por tipo de dimensión.
 *
 * Única fuente de verdad: el compilador la usa para VALIDAR (es la autoridad) y
 * el constructor visual para decidir qué ofrecer en el desplegable. Vive acá,
 * en el módulo de tipos, para que las dos mitades no puedan desincronizarse y
 * para que el cliente no tenga que importar el compilador.
 */
export const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  string: ['eq', 'ne', 'contains', 'starts_with', 'is_null', 'is_not_null'],
  enum: ['eq', 'ne', 'in', 'not_in', 'is_null', 'is_not_null'],
  number: ['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'between', 'is_null', 'is_not_null'],
  date: [
    'eq',
    'lt',
    'gt',
    'between',
    'last_n_days',
    'this_month',
    'last_month',
    'this_year',
    'is_null',
    'is_not_null',
  ],
  boolean: ['is_true', 'is_false', 'is_null'],
};

/**
 * Límites de una query. Viven acá porque los necesitan tanto el compilador
 * (para clampear y rechazar) como el constructor visual del cliente (para topar
 * los campos), y el cliente no debe importar el compilador.
 */
export const MAX_DIMENSIONS = 4;
export const MAX_LIMIT = 1000;
