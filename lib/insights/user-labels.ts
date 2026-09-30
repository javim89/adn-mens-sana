/**
 * Resolución de labels que no viven en Postgres.
 *
 * Hay columnas que guardan un Clerk userId sin FK (`entregas_comida.entregado_por`
 * es el caso del módulo de Viandas): no hay tabla de usuarios contra la que
 * hacer JOIN, así que el nombre no se puede traer en el SQL. Se resuelve acá,
 * después de correr la query y solo para los ids que realmente aparecieron en
 * el resultado, y se deja en `ColumnMeta.enumLabels`.
 *
 * Que el resultado viaje en `enumLabels` es deliberado: `formatCategory` (los
 * charts y la tabla) y el export a CSV ya traducen por ahí, así que ningún
 * renderer necesita enterarse de que estos labels tienen otro origen.
 *
 * Si Clerk falla, se devuelve el resultado intacto: se ven los ids, que es el
 * comportamiento que había antes. Un dashboard no se cae por esto.
 */

import { clerkClient } from '@clerk/nextjs/server';
import type { ColumnMeta, QueryResult } from './types';

/**
 * Tope de ids a resolver en una query. `getUserList` admite hasta 500 y ningún
 * widget legible tiene tantos responsables distintos; el tope está para que una
 * columna con cardinalidad inesperada no se convierta en un pedido gigante.
 */
const MAX_USER_IDS = 300;

function isResolvable(column: ColumnMeta): boolean {
  return column.labelSource === 'clerk_user';
}

/** Ids distintos que aparecen en las columnas a resolver, en orden de aparición. */
export function collectUserIds(
  columns: ColumnMeta[],
  rows: Record<string, unknown>[],
): string[] {
  const targets = columns.filter(isResolvable);
  if (targets.length === 0) return [];

  const ids = new Set<string>();
  for (const row of rows) {
    for (const column of targets) {
      const value = row[column.id];
      if (typeof value === 'string' && value !== '') ids.add(value);
    }
    if (ids.size >= MAX_USER_IDS) break;
  }
  return [...ids].slice(0, MAX_USER_IDS);
}

/**
 * Nombre visible de cada id. Mismo criterio que el resto del repo (viandas,
 * turnos, seguimientos): nombre y apellido, con el mail como respaldo y el id
 * como último recurso, para que la celda nunca quede vacía.
 */
async function fetchUserNames(ids: string[]): Promise<Record<string, string>> {
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      userId: ids,
      limit: ids.length,
    });

    const nombres: Record<string, string> = {};
    for (const user of data) {
      const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;
      const nombre = user.firstName || String(meta.firstName ?? '');
      const apellido = user.lastName || String(meta.lastName ?? '');
      nombres[user.id] =
        `${nombre} ${apellido}`.trim() ||
        user.emailAddresses?.[0]?.emailAddress ||
        user.id;
    }
    return nombres;
  } catch (error) {
    console.error('resolveUserLabels: falló la consulta a Clerk:', error);
    return {};
  }
}

/**
 * Devuelve el mismo resultado con `enumLabels` completado en las columnas que
 * lo pidan. Sin columnas a resolver no toca Clerk ni el objeto original.
 */
export async function resolveUserLabels(result: QueryResult): Promise<QueryResult> {
  const ids = collectUserIds(result.columns, result.rows);
  if (ids.length === 0) return result;

  const nombres = await fetchUserNames(ids);
  if (Object.keys(nombres).length === 0) return result;

  return {
    ...result,
    columns: result.columns.map((column) =>
      isResolvable(column)
        ? { ...column, enumLabels: { ...column.enumLabels, ...nombres } }
        : column,
    ),
  };
}
