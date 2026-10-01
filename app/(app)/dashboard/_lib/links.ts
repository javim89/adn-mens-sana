/**
 * Los deep links de las cards.
 *
 * Están centralizados porque de ellos depende LA propiedad que hace confiable al
 * dashboard: **el número de la card tiene que coincidir con la lista que linkea**.
 * Un param de más o de menos y la card miente, así que el query string exacto se
 * assertea en los tests en vez de quedar escrito a mano en seis componentes.
 */
import type { EstadoDeportista, NivelTriage } from '@/lib/generated/prisma/enums';
import type { PrioridadSeguimiento } from '@/lib/generated/prisma/enums';

/** El tamaño de página por defecto de `/deportistas` (`DeportistasTable`). */
const PAGE_SIZE = 20;

/** El bucket de los deportistas sin ningún snapshot de triage. La API ya lo acepta. */
export const SIN_CALCULAR = 'SIN_CALCULAR';

/**
 * Listado de deportistas filtrado por nivel de triage.
 *
 * **`estado=ACTIVO` es obligatorio y no es decorativo:** `getDeportistas` con
 * `filter[nivelTriage]` NO filtra por estado, así que cuenta también INACTIVO y
 * SUSPENDIDO. La query del dashboard cuenta solo ACTIVOS, así que el link tiene que
 * llevar el mismo criterio o el total del listado no va a coincidir con la card.
 * Es también por eso que la card se rotula "Deportistas **activos** en rojo".
 */
export function linkTriage(nivel: NivelTriage | typeof SIN_CALCULAR): string {
  const params = new URLSearchParams({
    'filter[nivelTriage]': nivel,
    'filter[estado]': 'ACTIVO',
    'page[number]': '1',
    'page[size]': String(PAGE_SIZE),
  });
  return `/deportistas?${params}`;
}

/** Listado de deportistas filtrado por estado, para la card de plantel. */
export function linkEstado(estado: EstadoDeportista): string {
  const params = new URLSearchParams({
    'filter[estado]': estado,
    'page[number]': '1',
    'page[size]': String(PAGE_SIZE),
  });
  return `/deportistas?${params}`;
}

/**
 * Listado de seguimientos por prioridad.
 *
 * El filtro acepta UN solo valor, y de ahí sale la decisión de mostrar ALTA y
 * URGENTE como dos números separados en vez de una suma: un total combinado no
 * tendría a dónde linkear sin mostrar un conjunto distinto del número.
 */
export function linkPrioridad(prioridad: PrioridadSeguimiento): string {
  return `/seguimientos?prioridad=${prioridad}`;
}
