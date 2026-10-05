/**
 * Helpers puros del módulo de viandas. Los importan tanto los server actions
 * como los componentes cliente, así que acá NO puede entrar nada de servidor
 * (ni `@/lib/db`, ni Clerk, ni `next/*`).
 */
import { TipoComida, LugarRetiro } from '@/lib/generated/prisma/enums';

export const LUGARES_RETIRO = [
  LugarRetiro.BOSQUESITO,
  LugarRetiro.SEDE,
  LugarRetiro.ESTANCIA_CHICA,
] as const;

export const COMIDAS = [
  TipoComida.DESAYUNO,
  TipoComida.ALMUERZO,
  TipoComida.MERIENDA,
  TipoComida.CENA,
] as const;

export function esLugarRetiro(v: unknown): v is LugarRetiro {
  return typeof v === 'string' && (LUGARES_RETIRO as readonly string[]).includes(v);
}

export function esTipoComida(v: unknown): v is TipoComida {
  return typeof v === 'string' && (COMIDAS as readonly string[]).includes(v);
}

/**
 * Categorías que reciben solo desayuno, sin merienda. Nombres exactos de
 * `categorias.nombre` (ver `scripts/seed-categorias.mjs`): la regla se aplica por
 * nombre y no por id porque el catálogo es global y los ids cambian entre
 * entornos. Es la única fuente de la regla — el dashboard y los insights arman
 * su SQL desde esta lista para que no se desincronicen.
 */
export const CATEGORIAS_SIN_MERIENDA = [
  'Reserva',
  '9na',
  '8va',
  '7ma',
  '6ta',
  '5ta',
  '4ta',
] as const;

/**
 * La merienda depende de la categoría, no de la ficha. Sin categoría asignada se
 * asume que SÍ recibe: es el comportamiento que había antes de la regla, y un
 * dato faltante no debería convertir cada merienda entregada en una anomalía.
 */
export function recibeMerienda(categoriaNombre: string | null | undefined): boolean {
  if (!categoriaNombre) return true;
  return !(CATEGORIAS_SIN_MERIENDA as readonly string[]).includes(categoriaNombre);
}

export type FlagsElegibilidad = {
  recibeAlmuerzo: boolean;
  recibeCena: boolean;
  /** Derivado de la categoría con `recibeMerienda()`, no de `necesidadesApoyo`. */
  recibeMerienda: boolean;
};

/**
 * Qué comidas prevé la ficha del deportista: el desayuno es de todo el plantel,
 * la merienda depende de la categoría (`CATEGORIAS_SIN_MERIENDA` no la reciben),
 * y almuerzo y cena salen del satélite `necesidadesApoyo`.
 *
 * Es INFORMATIVO, no un permiso. Cualquier comida se puede registrar para
 * cualquiera — `marcarRetiro` no valida esto a propósito, porque la ficha puede
 * estar incompleta y el responsable que entrega hoy no puede quedar trabado por
 * un dato que le falta cargar al administrador. Lo que esta función decide es
 * el color de la celda y el denominador "esperadas" de los contadores.
 */
export function comidasPrevistas(flags: FlagsElegibilidad): Record<TipoComida, boolean> {
  return {
    DESAYUNO: true,
    ALMUERZO: flags.recibeAlmuerzo,
    MERIENDA: flags.recibeMerienda,
    CENA: flags.recibeCena,
  };
}

/**
 * El filtro y el tag de `/viandas` miran solo almuerzo y cena: la merienda depende
 * de la categoría y el panel ya está filtrado por categoría, así que sería el
 * mismo valor en todas las filas.
 */
type FlagsAlmuerzoCena = Pick<FlagsElegibilidad, 'recibeAlmuerzo' | 'recibeCena'>;

export const FILTROS_COMIDA = ['ALMUERZO', 'CENA', 'AMBAS'] as const;

export type FiltroComida = (typeof FILTROS_COMIDA)[number];

export function esFiltroComida(v: unknown): v is FiltroComida {
  return typeof v === 'string' && (FILTROS_COMIDA as readonly string[]).includes(v);
}

/**
 * Filtro de `/viandas` por lo que prevé la ficha. ALMUERZO y CENA incluyen a los
 * que reciben las dos: el viandero que reparte almuerzos tiene que ver a todos
 * los que comen al mediodía, no solo a los que comen únicamente ahí. `null` = todos.
 */
export function coincideFiltroComida(
  flags: FlagsAlmuerzoCena,
  filtro: FiltroComida | null,
): boolean {
  switch (filtro) {
    case null:
      return true;
    case 'ALMUERZO':
      return flags.recibeAlmuerzo;
    case 'CENA':
      return flags.recibeCena;
    case 'AMBAS':
      return flags.recibeAlmuerzo && flags.recibeCena;
  }
}

/**
 * El empleado que entrega necesita saber de un vistazo qué le toca a cada chico,
 * así que los cuatro casos tienen su propio tag (incluido el "no recibe", que en
 * gris dice que la ficha no le prevé ni almuerzo ni cena — no que no se le pueda
 * dar).
 */
export function tagElegibilidad(
  flags: FlagsAlmuerzoCena,
): { label: string; className: string } | null {
  if (!flags.recibeAlmuerzo && !flags.recibeCena) {
    return { label: 'No recibe vianda', className: 'bg-gray-100 text-[#6B7280]' };
  }
  if (flags.recibeAlmuerzo && !flags.recibeCena) {
    return { label: 'Recibe solo almuerzo', className: 'bg-amber-50 text-amber-700' };
  }
  if (!flags.recibeAlmuerzo && flags.recibeCena) {
    return { label: 'Recibe solo cena', className: 'bg-sky-50 text-sky-700' };
  }
  return { label: 'Recibe almuerzo y cena', className: 'bg-emerald-50 text-emerald-700' };
}
