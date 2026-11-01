/**
 * Ejecución de queries de Insights.
 *
 * `runQuery` compila un `QuerySpec` del builder; `runRawSql` ejecuta SQL crudo
 * detrás del guard sintáctico y de una transacción read-only con timeout.
 *
 * Los dos caminos usan `getReadOnlyPrisma()`. El del builder también, aunque el
 * compilador solo emite SELECT: si alguna vez tuviera un bug, el rol de la base
 * es lo que lo contiene. Sin `DATABASE_URL_READONLY` seteada devuelve el
 * cliente normal (solo fuera de producción).
 *
 * Multi-tenant, dos capas: las dos queries llevan el prelude de
 * `tenant-prelude.ts` (CTEs acotados al club, `$1`), y corren en una
 * transacción read-only con el token de `insights_sesiones` seteado, que es lo
 * que leen las RLS de `insights_ro`.
 */

import { getReadOnlyPrisma } from '@/lib/db-readonly';
import { tokenDeInsights } from '@/lib/tenant/insights-sesion';
import { compile } from './compile';
import { validateRawSql } from './sql-guard';
import { withTenantPrelude } from './tenant-prelude';
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

/**
 * Ejecuta `sql` como el club: abre la transacción read-only, setea el token de
 * la sesión (lo leen las RLS de `insights_ro`) y recién ahí corre la query.
 */
async function ejecutarComoClub(clubId: string, sql: string, params: unknown[]): Promise<unknown> {
  const token = await tokenDeInsights(clubId);
  return getReadOnlyPrisma().$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'");
    await tx.$queryRawUnsafe("SELECT set_config('app.insights_token', $1, true)", token);
    return tx.$queryRawUnsafe(sql, ...params);
  });
}

export async function runQuery(
  spec: QuerySpec,
  clubId: string,
  now: Date = new Date(),
): Promise<QueryResult> {
  const { sql, params, columns } = compile(spec, now, { clubId });
  const rows = await ejecutarComoClub(clubId, sql, params);
  return { columns, rows: serializeRows(rows) };
}

export async function runRawSql(sql: string, clubId: string): Promise<QueryResult> {
  const validation = validateRawSql(sql);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  // El guard acepta un ';' final (con comentarios después); acá hay que sacarlo
  // porque la query se envuelve en una subquery. El salto de línea antes del
  // ')' es lo que evita que un comentario `--` al final se coma el paréntesis.
  const inner = sql.trim().replace(/;(?:\s|--[^\n]*|\/\*[\s\S]*?\*\/)*$/, '');

  // El prelude va afuera de la subquery: el SQL del usuario (incluso con su
  // propio WITH) ve las tablas ya acotadas al club, que viaja como `$1`.
  const rows = await ejecutarComoClub(
    clubId,
    withTenantPrelude(`SELECT * FROM (\n${inner}\n) __q LIMIT ${RAW_SQL_LIMIT}`),
    [clubId],
  );

  const serialized = serializeRows(rows);
  return { columns: inferColumns(serialized), rows: serialized };
}
