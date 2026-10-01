/**
 * Qué cards ve cada rol.
 *
 * **Se deriva de `lib/roles.ts`, que es la única fuente de verdad del nav.** No hay
 * un segundo `Record<AppRole, CardId[]>`: sería una matriz duplicada que va a
 * driftear, y contradice el diseño de `lib/roles.ts`, que definió los roles por
 * exclusión justamente para no mantener seis listas en sync. Si mañana `/viandas` se
 * abre a otro rol, el dashboard lo sigue solo.
 *
 * El mapeo no es "una card por nav item": tres cards apuntan a `/deportistas`. De
 * ahí el catálogo explícito `CARD_HREF` contrastado contra el set de hrefs del rol.
 *
 * **OJO — EL NAV NO ES AUTORIZACIÓN.** Es una afordancia de UI; los gates reales son
 * los `redirect('/dashboard')` de cada page. Hoy coinciden (`ROLES_VIANDAS` de
 * `viandas/page.tsx` == `ROUTE_ROLES['/viandas']`; `ROLES_PERMITIDOS` de presentismo
 * == los roles con ese nav item), pero son constantes separadas que podrían
 * driftear. La mitigación es un test que itera los 9 roles contra una matriz
 * hardcodeada EN EL TEST: si alguien cambia el guard de un módulo sin tocar
 * `lib/roles.ts`, rompe un test en vez de filtrar un conteo.
 *
 * Lo que este módulo NO hace es decidir el render: la page monta la sección o no la
 * monta, y la query vive DENTRO de la sección. Así "no se ve" implica "no se
 * ejecuta", sin ningún `if` alrededor de un `await`.
 */
import { getNavItemsForRole } from '@/lib/roles';

export type CardId =
  | 'triage'
  | 'plantel'
  | 'viandas'
  | 'turnos'
  | 'presentismo'
  | 'seguimientos'
  | 'eventos';

/**
 * A qué listado linkea cada card. Es también el criterio de visibilidad: si el rol
 * no tiene ese href en el nav, la card no se muestra.
 *
 * `plantel` y `triage` comparten `/deportistas` a propósito, y `eventos` está
 * separado de `plantel` para que el mapeo card→href quede 1:1 y cada card sea
 * linkeable con su filtro exacto.
 */
export const CARD_HREF: Record<CardId, string> = {
  triage: '/deportistas',
  plantel: '/deportistas',
  viandas: '/viandas',
  turnos: '/turnos',
  presentismo: '/presentismo',
  seguimientos: '/seguimientos',
  eventos: '/calendario',
};

const TODAS: CardId[] = Object.keys(CARD_HREF) as CardId[];

/**
 * Las cards que le corresponden a `role`.
 *
 * Un rol desconocido (o ausente) cae en el fallback de `getNavItemsForRole`, que es
 * solo `/dashboard`, así que devuelve el set vacío. Eso NO puede quedar como una
 * página en blanco: la page muestra un estado vacío explícito pidiendo que le
 * asignen un rol.
 */
export function cardsVisibles(role: string | undefined | null): Set<CardId> {
  const hrefs = new Set(getNavItemsForRole(role).map((i) => i.href));
  return new Set(TODAS.filter((card) => hrefs.has(CARD_HREF[card])));
}
