/**
 * Reglas de negocio del fotoKey de un deportista. Solo servidor.
 *
 * Una key de S3 pertenece a un solo deportista: si dos compartieran la misma,
 * reemplazar la foto de uno borraría el archivo del otro.
 *
 * Usa el cliente base a propósito: `foto_key` es unique global y "en uso" tiene
 * que ver las fotos de todos los clubes.
 */

import { prisma } from '@/lib/db';
import { fotoExiste, keyEsDelClub } from '@/lib/s3';
import { esViolacionDeUnique } from '@/lib/utils/prisma-errores';
import type { JsonApiErrors } from '@/lib/types/jsonapi';

export const FOTO_KEY_EN_USO = 'La foto ya está asignada a otro deportista';
export const FOTO_KEY_INEXISTENTE = 'La foto no se subió correctamente. Volvé a elegirla e intentá de nuevo';
export const FOTO_KEY_AJENA = 'La foto subida no es válida';

export async function isFotoKeyEnUso(key: string, excludeId?: string): Promise<boolean> {
  const owner = await prisma.deportista.findFirst({
    where: { fotoKey: key, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return owner !== null;
}

/**
 * Devuelve el motivo por el que la key no se puede asignar, o null si es válida.
 *
 * Una key nueva tiene que estar bajo el prefijo del club (`clubes/<clubId>/…`):
 * las subidas nuevas siempre caen ahí, así que una key legacy o de otro club solo
 * puede llegar armada a mano. La key que el deportista ya tenía no pasa por acá.
 */
export async function validarFotoKeyNueva(
  key: string,
  clubId: string,
  excludeId?: string,
): Promise<string | null> {
  if (!keyEsDelClub(key, clubId)) return FOTO_KEY_AJENA;
  if (await isFotoKeyEnUso(key, excludeId)) return FOTO_KEY_EN_USO;
  if (!(await fotoExiste(key))) return FOTO_KEY_INEXISTENTE;
  return null;
}

// `foto_key` sigue siendo unique global (no por club): una key de S3 es de un
// solo deportista en todo el bucket.
export function isFotoKeyUniqueViolation(error: unknown): boolean {
  return esViolacionDeUnique(error, 'foto_key', 'fotoKey');
}

export function fotoKeyErrorBody(detail: string): JsonApiErrors {
  return {
    errors: [
      {
        status: '422',
        code: 'VALIDATION_ERROR',
        title: 'Foto inválida',
        detail,
        source: { pointer: '/data/attributes/fotoKey' },
      },
    ],
  };
}
