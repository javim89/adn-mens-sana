/**
 * Ejecución de queries de Insights.
 *
 * `runQuery` compila un `QuerySpec` del builder; `runRawSql` ejecuta SQL crudo
 * detrás del guard sintáctico y de una transacción read-only con timeout.
 *
 * Los dos caminos usan `getReadOnlyPrisma()`. El del builder también, aunque el
 * compilador solo emite SELECT: si alguna vez tuviera un bug, el rol de la base
 * es lo que lo contiene. Sin `DATABASE_URL_READONLY` seteada devuelve el
 * cliente normal, así que el comportamiento por defecto no cambia.
 */

import { getReadOnlyPrisma } from '@/lib/db-readonly';
import { compile } from './compile';
import { validateRawSql } from './sql-guard';
import type { ColumnMeta, FieldType, QueryResult, QuerySpec } from './types';

const RAW_SQL_LIMIT = 1000;

interface DecimalLike {
  toNumber: () => number;
}

function isDecimalLike(value: object): value is DecimalLike {
  return typeof (value as Partial<DecimalLike>).toNumber === 'function';
}

function serializeValue(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (value !== null && typeof value === 'object') {
    if (value instanceof Date) return value;
    if (isDecimalLike(value)) return value.toNumber();
  }
  return value;
}

/**
 * Postgres devuelve los COUNT como BigInt y los NUMERIC como Decimal de Prisma.
 * Ninguno de los dos sobrevive a `JSON.stringify`, así que se pasan a Number
 * antes de que la fila salga del servidor.
 */
export function serializeRows(rows: unknown): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      out[key] = serializeValue(value);
    }
    return out;
  });
}

function inferType(value: unknown): FieldType {
  if (value instanceof Date) return 'date';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

/**
 * Infiere las columnas de un resultado crudo. Las numéricas son candidatas a
 * eje Y (role 'measure'); el resto, a eje X.
 */
export function inferColumns(rows: Record<string, unknown>[]): ColumnMeta[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]).map((key) => {
    const sample = rows.find((row) => row[key] !== null && row[key] !== undefined)?.[key];
    const type = inferType(sample);
    return {
      id: key,
      label: key,
      type,
      role: type === 'number' ? 'measure' : 'dimension',
    };
  });
}

export async function runQuery(spec: QuerySpec, now: Date = new Date()): Promise<QueryResult> {
  const { sql, params, columns } = compile(spec, now);
  const rows = await getReadOnlyPrisma().$queryRawUnsafe(sql, ...params);
  return { columns, rows: serializeRows(rows) };
}

export async function runRawSql(sql: string): Promise<QueryResult> {
  const validation = validateRawSql(sql);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  // El guard acepta un ';' final (con comentarios después); acá hay que sacarlo
  // porque la query se envuelve en una subquery. El salto de línea antes del
  // ')' es lo que evita que un comentario `--` al final se coma el paréntesis.
  const inner = sql.trim().replace(/;(?:\s|--[^\n]*|\/\*[\s\S]*?\*\/)*$/, '');

  const rows = await getReadOnlyPrisma().$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'");
    return tx.$queryRawUnsafe(
      `SELECT * FROM (\n${inner}\n) __q LIMIT ${RAW_SQL_LIMIT}`,
    );
  });

  const serialized = serializeRows(rows);
  return { columns: inferColumns(serialized), rows: serialized };
}
