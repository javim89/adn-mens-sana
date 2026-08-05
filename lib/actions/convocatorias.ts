'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import {
  getProximoPartido,
  getDeportistasParaConvocar,
} from '@/lib/queries/convocatorias';
import type {
  ConvocatoriaFormData,
  ProximoPartido,
  DeportistaConvocable,
} from '@/lib/types/convocatorias';

async function getCallerInfo() {
  const { userId } = await auth();
  if (!userId) return { userId: null, role: null };
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  return { userId, role };
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
    const { userId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

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

    const existing = await prisma.convocatoria.findUnique({
      where: { eventoTorneoId: data.eventoTorneoId },
    });
    if (existing) {
      return { success: false, error: 'Ya existe una convocatoria para este partido' };
    }

    const convocatoria = await prisma.convocatoria.create({
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
      error: error instanceof Error ? error.message : 'Error al crear la convocatoria',
    };
  }
}

export async function updateConvocatoria(
  id: string,
  data: ConvocatoriaFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.convocatoria.findUnique({ where: { id } });
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

    await prisma.convocatoriaDeportista.deleteMany({ where: { convocatoriaId: id } });

    await prisma.convocatoria.update({
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
      error: error instanceof Error ? error.message : 'Error al actualizar la convocatoria',
    };
  }
}

export async function deleteConvocatoria(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.convocatoria.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Convocatoria no encontrada' };

    if (role !== 'admin' && existing.registradoPor !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    await prisma.convocatoria.delete({ where: { id } });

    revalidatePath('/convocatorias');
    return { success: true };
  } catch (error) {
    console.error('deleteConvocatoria error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar la convocatoria',
    };
  }
}
