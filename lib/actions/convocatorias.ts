'use server';

import { revalidatePath } from 'next/cache';
import { dbDelClub } from '@/lib/tenant/db';
import { mensajeDeError } from '@/lib/tenant/errores';
import { getContextoClub } from '@/lib/tenant/contexto';
import {
  getProximoPartido,
  getDeportistasParaConvocar,
} from '@/lib/queries/convocatorias';
import type {
  ConvocatoriaFormData,
  ProximoPartido,
  DeportistaConvocable,
} from '@/lib/types/convocatorias';

/** Usuario y rol en el club activo. Sin club accesible, `userId` es null. */
async function getCallerInfo() {
  const contexto = await getContextoClub();
  if (!contexto) return { userId: null, clubId: null, role: null } as const;
  return { userId: contexto.userId, clubId: contexto.clubId, role: contexto.rol };
}

export async function getProximoPartidoAction(
  disciplinaId: string,
  categoriaId: string,
): Promise<ProximoPartido | null> {
  const { userId } = await getCallerInfo();
  if (!userId) return null;
  if (!disciplinaId || !categoriaId) return null;
  return getProximoPartido(disciplinaId, categoriaId);
}

export async function getDeportistasParaConvocarAction(
  disciplinaId: string,
  categoriaId: string,
): Promise<DeportistaConvocable[]> {
  const { userId } = await getCallerInfo();
  if (!userId) return [];
  if (!disciplinaId || !categoriaId) return [];
  return getDeportistasParaConvocar(disciplinaId, categoriaId);
}

export async function createConvocatoria(
  data: ConvocatoriaFormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const { userId, clubId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };
    const db = dbDelClub(clubId);

    const isAdmin = role === 'admin';
    // El form no expone selector de entrenador; por defecto es el usuario que crea.
    // Un admin podría, a futuro, asignar otro entrenador vía data.entrenadorId.
    const entrenadorId = (isAdmin ? data.entrenadorId : undefined) || userId;

    if (!data.eventoTorneoId) return { success: false, error: 'El partido es requerido' };
    if (!data.disciplinaId) return { success: false, error: 'La disciplina es requerida' };
    if (!data.categoriaId) return { success: false, error: 'La categoría es requerida' };
    if (!entrenadorId) return { success: false, error: 'El entrenador es requerido' };
    if (!data.convocados || data.convocados.length === 0) {
      return { success: false, error: 'Debe convocar al menos un deportista' };
    }

    const existing = await db.convocatoria.findUnique({
      where: { eventoTorneoId: data.eventoTorneoId },
    });
    if (existing) {
      return { success: false, error: 'Ya existe una convocatoria para este partido' };
    }

    const convocatoria = await db.convocatoria.create({
      data: {
        eventoTorneoId: data.eventoTorneoId,
        disciplinaId: data.disciplinaId,
        categoriaId: data.categoriaId,
        horaCitacion: data.horaCitacion?.trim() || null,
        lugar: data.lugar?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
        entrenadorId,
        registradoPor: userId,
        convocados: {
          createMany: {
            data: data.convocados.map((deportistaId) => ({ deportistaId })),
          },
        },
      },
    });

    revalidatePath('/convocatorias');
    return { success: true, id: convocatoria.id };
  } catch (error) {
    console.error('createConvocatoria error:', error);
    return {
      success: false,
      error: mensajeDeError(error, 'Error al crear la convocatoria'),
    };
  }
}

export async function updateConvocatoria(
  id: string,
  data: ConvocatoriaFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, clubId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };
    const db = dbDelClub(clubId);

    const existing = await db.convocatoria.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Convocatoria no encontrada' };

    const isAdmin = role === 'admin';
    if (!isAdmin && existing.registradoPor !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    if (!data.disciplinaId) return { success: false, error: 'La disciplina es requerida' };
    if (!data.categoriaId) return { success: false, error: 'La categoría es requerida' };
    if (!data.convocados || data.convocados.length === 0) {
      return { success: false, error: 'Debe convocar al menos un deportista' };
    }

    const entrenadorId = isAdmin
      ? data.entrenadorId || existing.entrenadorId
      : existing.entrenadorId;

    await db.convocatoriaDeportista.deleteMany({ where: { convocatoriaId: id } });

    await db.convocatoria.update({
      where: { id },
      data: {
        disciplinaId: data.disciplinaId,
        categoriaId: data.categoriaId,
        horaCitacion: data.horaCitacion?.trim() || null,
        lugar: data.lugar?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
        entrenadorId,
        convocados: {
          createMany: {
            data: data.convocados.map((deportistaId) => ({ deportistaId })),
          },
        },
      },
    });

    revalidatePath('/convocatorias');
    return { success: true };
  } catch (error) {
    console.error('updateConvocatoria error:', error);
    return {
      success: false,
      error: mensajeDeError(error, 'Error al actualizar la convocatoria'),
    };
  }
}

export async function deleteConvocatoria(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, clubId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };
    const db = dbDelClub(clubId);

    const existing = await db.convocatoria.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Convocatoria no encontrada' };

    if (role !== 'admin' && existing.registradoPor !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    await db.convocatoria.delete({ where: { id } });

    revalidatePath('/convocatorias');
    return { success: true };
  } catch (error) {
    console.error('deleteConvocatoria error:', error);
    return {
      success: false,
      error: mensajeDeError(error, 'Error al eliminar la convocatoria'),
    };
  }
}
