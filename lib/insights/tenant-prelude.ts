/**
 * Prelude multi-tenant de Insights: CTEs "sombra" que tapan cada tabla legible
 * con su versión acotada al club.
 *
 * Las queries de Insights (las del catálogo y el SQL crudo) nombran las tablas
 * sin esquema (`FROM deportistas`). Anteponiendo
 *
 *   WITH deportistas AS NOT MATERIALIZED (SELECT * FROM public.deportistas WHERE club_id = $1), …
 *
 * ese nombre resuelve al CTE y no a la tabla, así que la query solo ve filas
 * del club sin que el catálogo tenga que saber nada de tenants. Los hijos (sin
 * `club_id`) se filtran con `EXISTS` sobre el CTE del padre, que ya está
 * acotado; `clubes` se filtra por `id`.
 *
 * Es la primera de dos capas: alguien que escriba `public.deportistas` en el
 * modo SQL salta el prelude. Eso lo para la segunda, las RLS del rol
 * `insights_ro` (ver `scripts/setup-insights-rls.mjs`), que leen el mismo mapa
 * de `tenant-tablas.json`.
 *
 * `NOT MATERIALIZED` deja que Postgres inline cada CTE en el lugar donde se usa
 * (y aproveche los índices); los que no se usan no cuestan nada.
 *
 * El club siempre viaja como `$1`: quien arma la query tiene que empujarlo
 * primero en los parámetros.
 */

import tablas from './tenant-tablas.json';

export type TablaInsights = { tabla: string; padre?: string; fk?: string };

export const TABLA_CLUB: string = tablas.club;
export const TABLAS_EXCLUIDAS: readonly string[] = tablas.excluidas;
export const TABLAS_INSIGHTS: readonly TablaInsights[] = tablas.tablas;

/** Placeholder del club en el prelude. */
export const CLUB_PARAM = '$1';

const IDENT_RE = /^[a-z_][a-z0-9_]*$/;

function ident(nombre: string): string {
  if (!IDENT_RE.test(nombre)) {
    throw new Error(`Identificador inválido en tenant-tablas.json: "${nombre}"`);
  }
  return nombre;
}

function cteDe({ tabla, padre, fk }: TablaInsights): string {
  const t = ident(tabla);
  if (!padre) {
    return `${t} AS NOT MATERIALIZED (SELECT * FROM public.${t} WHERE club_id = ${CLUB_PARAM})`;
  }
  if (!fk) throw new Error(`La tabla "${tabla}" tiene padre pero no fk`);
  return (
    `${t} AS NOT MATERIALIZED (SELECT * FROM public.${t} __t ` +
    `WHERE EXISTS (SELECT 1 FROM ${ident(padre)} __p WHERE __p.id = __t.${ident(fk)}))`
  );
}

/** Lista de CTEs separada por comas, SIN el `WITH` (para poder fusionarla). */
export function tenantCtes(): string {
  const club = ident(TABLA_CLUB);
  return [
    `${club} AS NOT MATERIALIZED (SELECT * FROM public.${club} WHERE id = ${CLUB_PARAM})`,
    ...TABLAS_INSIGHTS.map(cteDe),
  ].join(',\n');
}

/**
 * Antepone el prelude a una query. Si la query ya empieza con `WITH` (los CTEs
 * de un dataset), se fusionan en un único `WITH`: los del dataset van después y
 * por eso ven las tablas ya acotadas.
 */
export function withTenantPrelude(sql: string): string {
  const rest = sql.replace(/^\s+/, '');
  const conWith = /^WITH\s+/i.exec(rest);
  if (conWith) {
    if (/^RECURSIVE\b/i.test(rest.slice(conWith[0].length))) {
      throw new Error('El prelude no se puede fusionar con un WITH RECURSIVE');
    }
    return `WITH ${tenantCtes()},\n${rest.slice(conWith[0].length)}`;
  }
  return `WITH ${tenantCtes()}\n${rest}`;
}
