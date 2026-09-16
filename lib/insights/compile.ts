/**
 * Compilador de `QuerySpec` → SQL parametrizado.
 *
 * Regla de seguridad, en una línea: lo único que se interpola son strings que
 * provienen del catálogo (código del repo); todo lo que viene del cliente son
 * ids que se usan como clave de lookup, o valores que viajan como `$n`. Un id
 * desconocido es un error, nunca un passthrough.
 */

import { getDataset } from './catalog';
import {
  MAX_DIMENSIONS,
  MAX_LIMIT,
  OPERATORS_BY_TYPE,
  isFilterGroup,
  isFormulaMeasure,
  type Aggregation,
  type AnyMeasure,
  type ColumnMeta,
  type CompiledQuery,
  type Dataset,
  type Dimension,
  type FilterCondition,
  type FilterGroup,
  type Measure,
  type Operator,
  type QuerySpec,
  type TimeGrain,
} from './types';

// Re-exportados desde `types.ts`, que es donde viven para que el cliente pueda
// leerlos sin importar el compilador.
export { MAX_DIMENSIONS, MAX_LIMIT } from './types';

const MAX_FILTER_DEPTH = 10;

const TIME_GRAINS: TimeGrain[] = ['day', 'week', 'month', 'quarter', 'year'];

const AGG_FN: Record<Aggregation, string> = {
  count: 'COUNT',
  count_distinct: 'COUNT',
  sum: 'SUM',
  avg: 'AVG',
  min: 'MIN',
  max: 'MAX',
};

/** Los alias del SELECT salen del catálogo; igual se validan antes de citarlos. */
const ALIAS_RE = /^[a-z][a-z0-9_]*$/;

function quoteAlias(id: string): string {
  if (!ALIAS_RE.test(id)) {
    throw new Error(`Alias inválido en el catálogo: "${id}"`);
  }
  return `"${id}"`;
}

function findDimension(dataset: Dataset, id: string): Dimension {
  const dim = dataset.dimensions.find((d) => d.id === id);
  if (!dim) {
    throw new Error(
      `Dimensión desconocida "${id}" para el dataset "${dataset.id}"`,
    );
  }
  return dim;
}

function findMeasure(dataset: Dataset, id: string): AnyMeasure {
  const measure = dataset.measures.find((m) => m.id === id);
  if (!measure) {
    throw new Error(`Medida desconocida "${id}" para el dataset "${dataset.id}"`);
  }
  return measure;
}

function aggExpression(measure: Measure): string {
  const inner = measure.agg === 'count_distinct' ? `DISTINCT ${measure.sql}` : measure.sql;
  const expr = `${AGG_FN[measure.agg]}(${inner})`;
  return measure.filterSql ? `${expr} FILTER (WHERE ${measure.filterSql})` : expr;
}

// ---------------------------------------------------------------------------
// Fórmulas
// ---------------------------------------------------------------------------

type FormulaToken =
  | { kind: 'ident'; value: string }
  | { kind: 'number'; value: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

function tokenizeFormula(formula: string, measureId: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (/\s/.test(ch)) {
      i += 1;
    } else if (/[a-z_]/i.test(ch)) {
      let j = i;
      while (j < formula.length && /[a-z0-9_]/i.test(formula[j])) j += 1;
      tokens.push({ kind: 'ident', value: formula.slice(i, j) });
      i = j;
    } else if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < formula.length && /[0-9.]/.test(formula[j])) j += 1;
      tokens.push({ kind: 'number', value: formula.slice(i, j) });
      i = j;
    } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ kind: 'op', value: ch });
      i += 1;
    } else if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i += 1;
    } else if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i += 1;
    } else {
      throw new Error(
        `Carácter inválido "${ch}" en la fórmula de la medida "${measureId}"`,
      );
    }
  }
  return tokens;
}

/**
 * Expande una `FormulaMeasure` a sus operandos.
 *
 * Los operandos se castean a `numeric` para que `presentes / registros` no caiga
 * en la división entera de bigint, y el divisor se envuelve en `NULLIF(…, 0)`
 * para evitar la división por cero.
 */
function compileFormula(dataset: Dataset, measureId: string, formula: string, operands: string[]): string {
  const tokens = tokenizeFormula(formula, measureId);
  let pos = 0;

  const peek = (): FormulaToken | undefined => tokens[pos];

  function parseFactor(): string {
    const token = tokens[pos];
    if (!token) {
      throw new Error(`Fórmula incompleta en la medida "${measureId}"`);
    }
    if (token.kind === 'op' && token.value === '-') {
      pos += 1;
      return `(-${parseFactor()})`;
    }
    if (token.kind === 'number') {
      pos += 1;
      if (!/^\d+(\.\d+)?$/.test(token.value)) {
        throw new Error(`Número inválido "${token.value}" en la medida "${measureId}"`);
      }
      return token.value;
    }
    if (token.kind === 'ident') {
      pos += 1;
      if (!operands.includes(token.value)) {
        throw new Error(
          `Operando "${token.value}" no declarado en la medida "${measureId}"`,
        );
      }
      const operand = findMeasure(dataset, token.value);
      if (isFormulaMeasure(operand)) {
        throw new Error(
          `La medida "${measureId}" no puede usar otra fórmula ("${token.value}") como operando`,
        );
      }
      return `(${aggExpression(operand)})::numeric`;
    }
    if (token.kind === 'lparen') {
      pos += 1;
      const inner = parseExpr();
      const close = tokens[pos];
      if (!close || close.kind !== 'rparen') {
        throw new Error(`Paréntesis sin cerrar en la medida "${measureId}"`);
      }
      pos += 1;
      return `(${inner})`;
    }
    throw new Error(`Fórmula inválida en la medida "${measureId}"`);
  }

  function parseTerm(): string {
    let left = parseFactor();
    for (;;) {
      const token = peek();
      if (!token || token.kind !== 'op' || (token.value !== '*' && token.value !== '/')) {
        return left;
      }
      pos += 1;
      const right = parseFactor();
      left =
        token.value === '/'
          ? `${left} / NULLIF(${right}, 0)`
          : `${left} * ${right}`;
    }
  }

  function parseExpr(): string {
    let left = parseTerm();
    for (;;) {
      const token = peek();
      if (!token || token.kind !== 'op' || (token.value !== '+' && token.value !== '-')) {
        return left;
      }
      pos += 1;
      left = `${left} ${token.value} ${parseTerm()}`;
    }
  }

  const sql = parseExpr();
  if (pos !== tokens.length) {
    throw new Error(`Fórmula inválida en la medida "${measureId}"`);
  }
  return `(${sql})`;
}

// ---------------------------------------------------------------------------
// Fechas relativas — se resuelven a fechas concretas antes de compilar
// ---------------------------------------------------------------------------

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function toDate(value: unknown, field: string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Fecha inválida para el filtro "${field}"`);
    }
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Fecha inválida para el filtro "${field}"`);
    }
    return parsed;
  }
  throw new Error(`Fecha inválida para el filtro "${field}"`);
}

/** Rango semiabierto [desde, hasta) de un operador de fecha relativo. */
function relativeRange(
  operator: Operator,
  value: unknown,
  field: string,
  now: Date,
): [Date, Date] {
  const today = startOfUtcDay(now);
  switch (operator) {
    case 'last_n_days': {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(
          `El operador "last_n_days" del filtro "${field}" requiere un entero positivo`,
        );
      }
      const hasta = addUtcDays(today, 1);
      return [addUtcDays(hasta, -n), hasta];
    }
    case 'this_month': {
      const desde = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      const hasta = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
      return [desde, hasta];
    }
    case 'last_month': {
      const desde = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const hasta = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return [desde, hasta];
    }
    case 'this_year': {
      const desde = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      const hasta = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1));
      return [desde, hasta];
    }
    default:
      throw new Error(`Operador relativo desconocido "${operator}"`);
  }
}

// ---------------------------------------------------------------------------
// WHERE
// ---------------------------------------------------------------------------

type PushParam = (value: unknown) => string;

function compileCondition(
  dataset: Dataset,
  condition: FilterCondition,
  push: PushParam,
  now: Date,
): string {
  const dim = findDimension(dataset, condition.field);
  if (dim.filterable === false) {
    throw new Error(`La dimensión "${dim.id}" no es filtrable`);
  }

  const allowed = OPERATORS_BY_TYPE[dim.type];
  if (!allowed.includes(condition.operator)) {
    throw new Error(
      `Operador "${condition.operator}" no válido para la dimensión "${dim.id}" (${dim.type})`,
    );
  }

  const expr = dim.sql;
  const { operator, value } = condition;

  switch (operator) {
    case 'is_null':
      return `${expr} IS NULL`;
    case 'is_not_null':
      return `${expr} IS NOT NULL`;
    case 'is_true':
      return `${expr} IS TRUE`;
    case 'is_false':
      return `${expr} IS FALSE`;
    case 'in':
    case 'not_in': {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(
          `El operador "${operator}" del filtro "${dim.id}" requiere una lista no vacía`,
        );
      }
      const placeholder = push(value);
      return operator === 'in'
        ? `${expr} = ANY(${placeholder})`
        : `${expr} <> ALL(${placeholder})`;
    }
    case 'contains':
    case 'starts_with': {
      if (typeof value !== 'string') {
        throw new Error(`El filtro "${dim.id}" requiere un texto`);
      }
      const pattern = escapeLike(value);
      return `${expr} ILIKE ${push(operator === 'contains' ? `%${pattern}%` : `${pattern}%`)}`;
    }
    case 'between': {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error(
          `El operador "between" del filtro "${dim.id}" requiere dos valores`,
        );
      }
      const [from, to] =
        dim.type === 'date'
          ? [toDate(value[0], dim.id), toDate(value[1], dim.id)]
          : [requireNumber(value[0], dim.id), requireNumber(value[1], dim.id)];
      return `${expr} BETWEEN ${push(from)} AND ${push(to)}`;
    }
    case 'last_n_days':
    case 'this_month':
    case 'last_month':
    case 'this_year': {
      const [desde, hasta] = relativeRange(operator, value, dim.id, now);
      return `(${expr} >= ${push(desde)} AND ${expr} < ${push(hasta)})`;
    }
    case 'eq':
    case 'ne':
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      const sqlOp = { eq: '=', ne: '<>', lt: '<', lte: '<=', gt: '>', gte: '>=' }[operator];
      const param =
        dim.type === 'date'
          ? toDate(value, dim.id)
          : dim.type === 'number'
            ? requireNumber(value, dim.id)
            : requireScalar(value, dim.id);
      return `${expr} ${sqlOp} ${push(param)}`;
    }
    default:
      throw new Error(`Operador desconocido "${operator as string}"`);
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function requireNumber(value: unknown, field: string): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`El filtro "${field}" requiere un número`);
  }
  return n;
}

function requireScalar(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`El filtro "${field}" requiere un texto`);
  }
  return value;
}

function compileFilterGroup(
  dataset: Dataset,
  group: FilterGroup,
  push: PushParam,
  now: Date,
  depth: number,
): string {
  if (depth > MAX_FILTER_DEPTH) {
    throw new Error('Los filtros exceden la profundidad máxima de anidamiento');
  }
  if (group.op !== 'all' && group.op !== 'any') {
    throw new Error(`Operador de grupo inválido "${String(group.op)}"`);
  }
  if (!Array.isArray(group.children)) {
    throw new Error('El grupo de filtros no tiene hijos');
  }

  const parts = group.children
    .map((child) =>
      isFilterGroup(child)
        ? compileFilterGroup(dataset, child, push, now, depth + 1)
        : compileCondition(dataset, child, push, now),
    )
    .filter((part) => part.length > 0);

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `(${parts.join(group.op === 'all' ? ' AND ' : ' OR ')})`;
}

// ---------------------------------------------------------------------------
// compile
// ---------------------------------------------------------------------------

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return MAX_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

export function compile(spec: QuerySpec, now: Date = new Date()): CompiledQuery {
  if (!spec || spec.mode !== 'builder') {
    throw new Error('QuerySpec inválido: se esperaba mode "builder"');
  }

  const dataset = getDataset(spec.dataset);
  if (!dataset) {
    throw new Error(`Dataset desconocido "${String(spec.dataset)}"`);
  }

  const dimensionIds = dedupe(spec.dimensions ?? []);
  const measureIds = dedupe(spec.measures ?? []);

  if (dimensionIds.length > MAX_DIMENSIONS) {
    throw new Error(
      `La query no puede tener más de ${MAX_DIMENSIONS} dimensiones (recibidas ${dimensionIds.length})`,
    );
  }
  if (dimensionIds.length === 0 && measureIds.length === 0) {
    throw new Error('La query debe tener al menos una dimensión o una medida');
  }

  const params: unknown[] = [];
  const push: PushParam = (value) => `$${params.push(value)}`;

  // 1. Resolución del time grain contra las dimensiones seleccionadas.
  let timeDimensionId: string | undefined;
  if (spec.timeGrain !== undefined) {
    if (!TIME_GRAINS.includes(spec.timeGrain)) {
      throw new Error(`timeGrain inválido "${String(spec.timeGrain)}"`);
    }
    if (spec.timeDimension !== undefined) {
      const dim = findDimension(dataset, spec.timeDimension);
      if (dim.type !== 'date') {
        throw new Error(`La dimensión "${dim.id}" no es de tipo date`);
      }
      if (!dimensionIds.includes(dim.id)) {
        throw new Error(
          `timeDimension "${dim.id}" no está entre las dimensiones seleccionadas`,
        );
      }
      timeDimensionId = dim.id;
    } else {
      timeDimensionId = dimensionIds.find(
        (id) => findDimension(dataset, id).type === 'date',
      );
      if (!timeDimensionId) {
        throw new Error('timeGrain requiere una dimensión de tipo date');
      }
    }
  }

  // 2 y 3. SELECT: dimensiones y luego medidas.
  const selectParts: string[] = [];
  const columns: ColumnMeta[] = [];

  for (const id of dimensionIds) {
    const dim = findDimension(dataset, id);
    const expr =
      dim.id === timeDimensionId && spec.timeGrain
        ? `date_trunc(${push(spec.timeGrain)}, ${dim.sql})`
        : dim.sql;
    selectParts.push(`${expr} AS ${quoteAlias(dim.id)}`);
    columns.push({
      id: dim.id,
      label: dim.label,
      type: dim.id === timeDimensionId ? 'date' : dim.type,
      role: 'dimension',
      ...(dim.enumLabels ? { enumLabels: dim.enumLabels } : {}),
    });
  }

  for (const id of measureIds) {
    const measure = findMeasure(dataset, id);
    const expr = isFormulaMeasure(measure)
      ? compileFormula(dataset, measure.id, measure.formula, measure.operands)
      : aggExpression(measure);
    selectParts.push(`${expr} AS ${quoteAlias(measure.id)}`);
    columns.push({
      id: measure.id,
      label: measure.label,
      type: 'number',
      role: 'measure',
      format: measure.format,
    });
  }

  // 4. FROM + joins, todos literales del catálogo.
  const lines: string[] = [];
  if (dataset.cte) lines.push(dataset.cte);
  lines.push(`SELECT ${selectParts.join(', ')}`);
  lines.push(`FROM ${dataset.from}`);
  for (const join of dataset.joins) lines.push(join);

  // 5. WHERE.
  if (spec.filters) {
    const where = compileFilterGroup(dataset, spec.filters, push, now, 0);
    if (where) lines.push(`WHERE ${where}`);
  }

  // 6. GROUP BY por posición ordinal.
  if (dimensionIds.length > 0) {
    lines.push(`GROUP BY ${dimensionIds.map((_, i) => i + 1).join(', ')}`);
  }

  // 7. ORDER BY por posición ordinal.
  const sort = spec.sort ?? [];
  if (sort.length > 0) {
    const selectIds = [...dimensionIds, ...measureIds];
    const orderParts = sort.map((entry) => {
      const index = selectIds.indexOf(entry.field);
      if (index === -1) {
        throw new Error(
          `El campo de orden "${String(entry.field)}" no está en el SELECT`,
        );
      }
      if (entry.direction !== 'asc' && entry.direction !== 'desc') {
        throw new Error(`Dirección de orden inválida "${String(entry.direction)}"`);
      }
      return `${index + 1} ${entry.direction === 'asc' ? 'ASC' : 'DESC'}`;
    });
    lines.push(`ORDER BY ${orderParts.join(', ')}`);
  }

  // 8. LIMIT clampeado.
  lines.push(`LIMIT ${push(clampLimit(spec.limit))}`);

  return { sql: lines.join('\n'), params, columns };
}

function dedupe(ids: string[]): string[] {
  if (!Array.isArray(ids)) {
    throw new Error('Se esperaba una lista de ids');
  }
  return [...new Set(ids)];
}
