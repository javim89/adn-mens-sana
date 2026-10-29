'use server';

import { revalidatePath } from 'next/cache';
import { dbDelClub } from '@/lib/tenant/db';
import { mensajeDeError } from '@/lib/tenant/errores';
import {
  getDeportistasParaAsistencia,
  type DeportistaAsistenciaItem,
} from '@/lib/queries/presentismo';
import type { AppRole } from '@/lib/roles';
import { getContextoClub } from '@/lib/tenant/contexto';
import { getMiembrosDelClub } from '@/lib/tenant/miembros';
import type { EntrenamientoFormData, Entrenador } from '@/lib/types/presentismo';

const ENTRENADOR_ROLES: AppRole[] = ['entrenador', 'admin'];

/** Usuario y rol en el club activo. Sin club accesible, `userId` es null. */
async function getCallerInfo() {
  const contexto = await getContextoClub();
  if (!contexto) return { userId: null, clubId: null, role: null } as const;
  return { userId: contexto.userId, clubId: contexto.clubId, role: contexto.rol };
}

export async function getEntrenadores(): Promise<Entrenador[]> {
  const { role } = await getCallerInfo();
  if (role !== 'admin') return [];

  const miembros = await getMiembrosDelClub({ roles: ENTRENADOR_ROLES });
  return miembros.map((m) => ({ id: m.userId, nombre: m.nombre, apellido: m.apellido, rol: m.rol }));
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
    const { userId, clubId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };
    const db = dbDelClub(clubId);

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

    const entrenamiento = await db.entrenamiento.create({
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
      error: mensajeDeError(error, 'Error al crear el entrenamiento'),
    };
  }
}

export async function updateEntrenamiento(
  id: string,
  data: EntrenamientoFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, clubId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };
    const db = dbDelClub(clubId);

    const existing = await db.entrenamiento.findUnique({ where: { id } });
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

    await db.asistencia.deleteMany({ where: { entrenamientoId: id } });

    await db.entrenamiento.update({
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
      error: mensajeDeError(error, 'Error al actualizar el entrenamiento'),
    };
  }
}

export async function deleteEntrenamiento(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, clubId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };
    const db = dbDelClub(clubId);

    const existing = await db.entrenamiento.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Entrenamiento no encontrado' };

    if (role !== 'admin' && existing.registradoPor !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    await db.entrenamiento.delete({ where: { id } });

    revalidatePath('/presentismo');
    return { success: true };
  } catch (error) {
    console.error('deleteEntrenamiento error:', error);
    return {
      success: false,
      error: mensajeDeError(error, 'Error al eliminar el entrenamiento'),
    };
  }
}
