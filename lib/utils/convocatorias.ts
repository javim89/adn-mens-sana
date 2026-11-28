import type { EstadoDeportista } from '@/lib/generated/prisma/enums';

export const SIN_POSICION = 'Sin posición';

export interface GrupoPosicion {
  /** Rótulo visible: la escritura más usada del grupo (o la capitalizada, si empatan). */
  posicion: string;
  cantidad: number;
}

function claveDePosicion(posicion: string): string {
  return posicion
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function capitalizar(texto: string): string {
  const limpio = texto.trim().replace(/\s+/g, ' ');
  return limpio.charAt(0).toLocaleUpperCase('es') + limpio.slice(1).toLocaleLowerCase('es');
}

function rotuloDelGrupo(escrituras: Map<string, number>): string {
  let mejor: string | null = null;
  let maximo = 0;
  let empate = false;
  for (const [escritura, veces] of escrituras) {
    if (veces > maximo) {
      mejor = escritura;
      maximo = veces;
      empate = false;
    } else if (veces === maximo) {
      empate = true;
    }
  }
  return empate || mejor === null ? capitalizar([...escrituras.keys()][0]) : mejor;
}

/**
 * Cantidad de deportistas por posición. `posicion` es texto libre, así que
 * " Arquero", "arquero" y "ARQUERO" (y "Delantero" / "delantero") cuentan juntos:
 * se agrupa por la versión sin espacios de más, en minúsculas y sin tildes. Los
 * que no tienen posición van al grupo "Sin posición", siempre al final. El resto
 * se ordena por cantidad desc y luego alfabéticamente.
 */
export function agruparPorPosicion(
  deportistas: readonly { posicion: string | null | undefined }[],
): GrupoPosicion[] {
  const grupos = new Map<string, { escrituras: Map<string, number>; cantidad: number }>();
  let sinPosicion = 0;

  for (const d of deportistas) {
    const original = d.posicion?.trim().replace(/\s+/g, ' ') ?? '';
    if (!original) {
      sinPosicion += 1;
      continue;
    }
    const clave = claveDePosicion(original);
    const grupo = grupos.get(clave) ?? { escrituras: new Map<string, number>(), cantidad: 0 };
    grupo.cantidad += 1;
    grupo.escrituras.set(original, (grupo.escrituras.get(original) ?? 0) + 1);
    grupos.set(clave, grupo);
  }

  const resultado: GrupoPosicion[] = [...grupos.values()]
    .map((g) => ({ posicion: rotuloDelGrupo(g.escrituras), cantidad: g.cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.posicion.localeCompare(b.posicion, 'es'));

  if (sinPosicion > 0) resultado.push({ posicion: SIN_POSICION, cantidad: sinPosicion });
  return resultado;
}

const ESTADOS: readonly EstadoDeportista[] = ['ACTIVO', 'LESIONADO', 'SUSPENDIDO', 'INACTIVO'];

/** Convocados por estado del deportista, con los 4 estados en cero si no hay. */
export function contarPorEstado(
  deportistas: readonly { estado: EstadoDeportista }[],
): Record<EstadoDeportista, number> {
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<EstadoDeportista, number>;
  for (const d of deportistas) {
    if (d.estado in conteo) conteo[d.estado] += 1;
  }
  return conteo;
}
