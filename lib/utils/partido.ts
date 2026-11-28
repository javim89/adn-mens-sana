export type CondicionPartido = 'Local' | 'Visitante';

interface EquipoPartido {
  nombre?: string;
  esPropio?: boolean | null;
}

export interface EventoConEquipos {
  local: EquipoPartido;
  visitante: EquipoPartido;
}

/**
 * Condición del club en un partido, según cuál de los dos equipos es el propio
 * (`Equipo.esPropio`). `null` si ninguno lo es (fixture de otros equipos o datos
 * viejos sin marcar): la UI no muestra el chip en vez de adivinar.
 */
export function condicionPartido(evento: EventoConEquipos): CondicionPartido | null {
  if (evento.local.esPropio) return 'Local';
  if (evento.visitante.esPropio) return 'Visitante';
  return null;
}

/**
 * El rival del club: el equipo que no es el propio. Sin equipo propio en el
 * partido no hay rival definido y devuelve `null` (la UI muestra "local vs. visitante").
 */
export function rivalPartido(evento: EventoConEquipos): string | null {
  const condicion = condicionPartido(evento);
  if (condicion === 'Local') return evento.visitante.nombre ?? null;
  if (condicion === 'Visitante') return evento.local.nombre ?? null;
  return null;
}
