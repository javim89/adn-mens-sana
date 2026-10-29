/**
 * Violaciones de unique (P2002) de Prisma.
 *
 * Con los uniques por club el target dejó de ser una sola columna: un DNI
 * repetido ahora viola `[club_id, dni]`. Según la versión y el driver adapter, el
 * detalle viene en `meta.target` (array de columnas o nombre del índice) o en
 * `meta.driverAdapterError`, así que se busca la columna en todo `meta`.
 */

type ErrorPrisma = { code?: unknown; meta?: unknown };

/** `true` si es un P2002 y alguna de `columnas` (snake_case o camelCase) aparece en el detalle. */
export function esViolacionDeUnique(error: unknown, ...columnas: string[]): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, meta } = error as ErrorPrisma;
  if (code !== 'P2002') return false;
  if (columnas.length === 0) return true;
  const detalle = JSON.stringify(meta ?? {});
  return columnas.some((c) => detalle.includes(c));
}

/** Mensaje para un DNI o email repetido dentro del club, o `null` si el P2002 es de otra cosa. */
export function mensajeDuplicadoDeportista(error: unknown): string | null {
  if (esViolacionDeUnique(error, 'dni')) return 'Ya existe un deportista con ese DNI en el club';
  if (esViolacionDeUnique(error, 'email')) return 'Ya existe un deportista con ese email en el club';
  return null;
}
