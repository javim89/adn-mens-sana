import { diaCortoDb, diaYMesCortoDb } from '../../dashboard/_lib/formato';

export const BADGE =
  'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';

/** "vs. Rival" si el club juega el partido; si no, "Local vs. Visitante". */
export function tituloPartido(partido: {
  rival: string | null;
  local: string;
  visitante: string;
}): string {
  return partido.rival ? `vs. ${partido.rival}` : `${partido.local} vs. ${partido.visitante}`;
}

/** Las dos líneas del `TileFecha` desde una clave `'YYYY-MM-DD'`: "MIÉ" y "30/9". */
export function tileDeClave(clave: string): { arriba: string; abajo: string } {
  const d = new Date(`${clave}T00:00:00.000Z`);
  return { arriba: diaCortoDb(d), abajo: diaYMesCortoDb(d) };
}

export function textoConvocados(n: number): string {
  return `${n} ${n === 1 ? 'convocado' : 'convocados'}`;
}
