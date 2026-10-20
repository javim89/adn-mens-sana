/**
 * Reglas de negocio del fotoKey de un deportista. Solo servidor.
 *
 * Una key de S3 pertenece a un solo deportista: si dos compartieran la misma,
 * reemplazar la foto de uno borraría el archivo del otro.
 */

import { prisma } from '@/lib/db';
import { fotoExiste } from '@/lib/s3';
import type { JsonApiErrors } from '@/lib/types/jsonapi';

export const FOTO_KEY_EN_USO = 'La foto ya está asignada a otro deportista';
export const FOTO_KEY_INEXISTENTE = 'La foto no se subió correctamente. Volvé a elegirla e intentá de nuevo';

export async function isFotoKeyEnUso(key: string, excludeId?: string): Promise<boolean> {
  const owner = await prisma.deportista.findFirst({
    where: { fotoKey: key, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return owner !== null;
}

/** Devuelve el motivo por el que la key no se puede asignar, o null si es válida. */
export async function validarFotoKeyNueva(key: string, excludeId?: string): Promise<string | null> {
  if (await isFotoKeyEnUso(key, excludeId)) return FOTO_KEY_EN_USO;
  if (!(await fotoExiste(key))) return FOTO_KEY_INEXISTENTE;
  return null;
}

// Con driver adapters el detalle del constraint puede venir en meta.target o en
// meta.driverAdapterError, según la versión: se busca la columna en todo meta.
export function isFotoKeyUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, meta } = error as { code?: unknown; meta?: unknown };
  if (code !== 'P2002') return false;
  const metaText = JSON.stringify(meta ?? {});
  return metaText.includes('foto_key') || metaText.includes('fotoKey');
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
