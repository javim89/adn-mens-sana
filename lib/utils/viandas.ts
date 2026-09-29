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

export type FlagsElegibilidad = {
  recibeAlmuerzo: boolean;
  recibeCena: boolean;
};

/**
 * Qué comidas prevé la ficha del deportista: desayuno y merienda son de todo el
 * plantel, almuerzo y cena salen del satélite `necesidadesApoyo`.
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
    MERIENDA: true,
    CENA: flags.recibeCena,
  };
}

/**
 * El empleado que entrega necesita saber de un vistazo qué le toca a cada chico,
 * así que los cuatro casos tienen su propio tag (incluido el "no recibe", que en
 * gris dice que la ficha no le prevé ni almuerzo ni cena — no que no se le pueda
 * dar).
 */
export function tagElegibilidad(
  flags: FlagsElegibilidad,
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
