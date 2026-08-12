'use server';

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import {
  getDeportistasParaAsistencia,
  type DeportistaAsistenciaItem,
} from '@/lib/queries/presentismo';
import type { EntrenamientoFormData, Entrenador } from '@/lib/types/presentismo';

const ENTRENADOR_ROLES = ['entrenador', 'admin'];

async function getCallerInfo() {
  const { userId } = await auth();
  if (!userId) return { userId: null, role: null };
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  return { userId, role };
}

export async function getEntrenadores(): Promise<Entrenador[]> {
  const { role } = await getCallerInfo();
  if (role !== 'admin') return [];

  const client = await clerkClient();
  const response = await client.users.getUserList({ limit: 100 });

  return response.data
    .filter((u) => {
      const r = String((u.publicMetadata as Record<string, unknown>)?.role ?? '');
      return ENTRENADOR_ROLES.includes(r);
    })
    .map((u) => {
      const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
      return {
        id: u.id,
        nombre: u.firstName || String(meta.firstName ?? ''),
        apellido: u.lastName || String(meta.lastName ?? ''),
        rol: String(meta.role ?? ''),
      };
    })
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
}

export async function getDeportistasParaAsistenciaAction(
  disciplinaId: string,
  categoriaId: string,
): Promise<DeportistaAsistenciaItem[]> {
  const { userId } = await getCallerInfo();
  if (!userId) return [];
  if (!disciplinaId || !categoriaId) return [];
  return getDeportistasParaAsistencia(disciplinaId, categoriaId);
}

export async function createEntrenamiento(
  data: EntrenamientoFormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const { userId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const isAdmin = role === 'admin';
    const entrenadorId = isAdmin ? data.entrenadorId : userId;

    if (!data.fecha) return { success: false, error: 'La fecha es requerida' };
    if (!data.tipoSesion) return { success: false, error: 'El tipo de sesión es requerido' };
    if (!data.disciplinaId) return { success: false, error: 'La disciplina es requerida' };
    if (!data.categoriaId) return { success: false, error: 'La categoría es requerida' };
    if (!entrenadorId) return { success: false, error: 'El entrenador es requerido' };
    if (!data.asistencias || data.asistencias.length === 0) {
      return { success: false, error: 'Debe registrar al menos un deportista' };
    }

    const entrenamiento = await prisma.entrenamiento.create({
      data: {
        fecha: new Date(data.fecha),
        entrenadorId,
        tipoSesion: data.tipoSesion,
        objetivos: data.objetivos?.trim() || null,
        disciplinaId: data.disciplinaId,
        categoriaId: data.categoriaId,
        registradoPor: userId,
        asistencias: {
          createMany: {
            data: data.asistencias.map((a) => ({
              deportistaId: a.deportistaId,
              estado: a.estado,
              notas: a.notas?.trim() || null,
            })),
          },
        },
      },
    });

    revalidatePath('/presentismo');
    return { success: true, id: entrenamiento.id };
  } catch (error) {
    console.error('createEntrenamiento error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el entrenamiento',
    };
  }
}

export async function updateEntrenamiento(
  id: string,
  data: EntrenamientoFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.entrenamiento.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Entrenamiento no encontrado' };

    const isAdmin = role === 'admin';
    if (!isAdmin && existing.registradoPor !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    if (!data.fecha) return { success: false, error: 'La fecha es requerida' };
    if (!data.tipoSesion) return { success: false, error: 'El tipo de sesión es requerido' };
    if (!data.disciplinaId) return { success: false, error: 'La disciplina es requerida' };
    if (!data.categoriaId) return { success: false, error: 'La categoría es requerida' };
    if (!data.asistencias || data.asistencias.length === 0) {
      return { success: false, error: 'Debe registrar al menos un deportista' };
    }

    const entrenadorId = isAdmin ? data.entrenadorId || existing.entrenadorId : existing.entrenadorId;

    await prisma.asistencia.deleteMany({ where: { entrenamientoId: id } });

    await prisma.entrenamiento.update({
      where: { id },
      data: {
        fecha: new Date(data.fecha),
        entrenadorId,
        tipoSesion: data.tipoSesion,
        objetivos: data.objetivos?.trim() || null,
        disciplinaId: data.disciplinaId,
        categoriaId: data.categoriaId,
        asistencias: {
          createMany: {
            data: data.asistencias.map((a) => ({
              deportistaId: a.deportistaId,
              estado: a.estado,
              notas: a.notas?.trim() || null,
            })),
          },
        },
      },
    });

    revalidatePath('/presentismo');
    return { success: true };
  } catch (error) {
    console.error('updateEntrenamiento error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el entrenamiento',
    };
  }
}

export async function deleteEntrenamiento(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.entrenamiento.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Entrenamiento no encontrado' };

    if (role !== 'admin' && existing.registradoPor !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    await prisma.entrenamiento.delete({ where: { id } });

    revalidatePath('/presentismo');
    return { success: true };
  } catch (error) {
    console.error('deleteEntrenamiento error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar el entrenamiento',
    };
  }
}
