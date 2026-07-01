'use server';

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import type { SeguimientoFormData, Profesional } from '@/lib/types/seguimientos';

const HEALTH_ROLES = ['medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo'];
const CAN_WRITE_ROLES = ['admin', ...HEALTH_ROLES];

async function getCallerInfo() {
  const { userId } = await auth();
  if (!userId) return { userId: null, role: null, isAdmin: false };
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  const isAdmin = role === 'admin';
  return { userId, role, isAdmin };
}

export async function getProfesionalesSeguimientos(): Promise<Profesional[]> {
  const { isAdmin } = await getCallerInfo();
  if (!isAdmin) return [];

  const client = await clerkClient();
  const response = await client.users.getUserList({ limit: 100 });

  return response.data
    .filter((u) => {
      const r = String((u.publicMetadata as Record<string, unknown>)?.role ?? '');
      return HEALTH_ROLES.includes(r);
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

export async function createSeguimiento(
  data: SeguimientoFormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const { userId, role, isAdmin } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    if (!CAN_WRITE_ROLES.includes(role ?? '')) {
      return { success: false, error: 'No autorizado' };
    }

    if (!data.titulo?.trim()) return { success: false, error: 'El título es requerido' };
    if (!data.fecha) return { success: false, error: 'La fecha es requerida' };
    if (!data.deportistaId) return { success: false, error: 'El deportista es requerido' };

    // Regla de propiedad en create: admin puede asignar un profesionalId diferente;
    // profesional de salud siempre usa su propio userId como profesionalId.
    const profesionalId = isAdmin ? data.profesionalId : userId;
    if (!profesionalId) return { success: false, error: 'El profesional es requerido' };

    const prioridad = data.prioridad || 'MEDIA';

    const proximaCita =
      data.proximaCita && data.proximaCita.trim()
        ? new Date(data.proximaCita)
        : null;

    const seguimiento = await prisma.seguimiento.create({
      data: {
        deportistaId: data.deportistaId,
        profesionalId,
        fecha: new Date(data.fecha),
        titulo: data.titulo.trim(),
        descripcion: data.descripcion?.trim() || null,
        recomendaciones: data.recomendaciones?.trim() || null,
        resultadosEvaluacion: data.resultadosEvaluacion?.trim() || null,
        prioridad,
        proximaCita,
        alertaSeguimiento: data.alertaSeguimiento?.trim() || null,
      },
    });

    revalidatePath('/seguimientos');
    return { success: true, id: seguimiento.id };
  } catch (error) {
    console.error('createSeguimiento error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el seguimiento',
    };
  }
}

export async function updateSeguimiento(
  id: string,
  data: SeguimientoFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, isAdmin } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.seguimiento.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Seguimiento no encontrado' };

    // Regla de propiedad: solo el dueño o admin puede editar
    const isOwner = existing.profesionalId === userId;
    const canModify = isAdmin || isOwner;
    if (!canModify) {
      return {
        success: false,
        error:
          'No autorizado — solo el profesional que creó este seguimiento o un administrador puede editarlo',
      };
    }

    // Admin puede reasignar el profesional; el dueño mantiene su propio profesionalId
    const profesionalId = isAdmin ? data.profesionalId : existing.profesionalId;

    const proximaCita =
      data.proximaCita && data.proximaCita.trim()
        ? new Date(data.proximaCita)
        : null;

    await prisma.seguimiento.update({
      where: { id },
      data: {
        deportistaId: data.deportistaId,
        profesionalId,
        fecha: new Date(data.fecha),
        titulo: data.titulo.trim(),
        descripcion: data.descripcion?.trim() || null,
        recomendaciones: data.recomendaciones?.trim() || null,
        resultadosEvaluacion: data.resultadosEvaluacion?.trim() || null,
        prioridad: data.prioridad || 'MEDIA',
        proximaCita,
        alertaSeguimiento: data.alertaSeguimiento?.trim() || null,
      },
    });

    revalidatePath('/seguimientos');
    return { success: true };
  } catch (error) {
    console.error('updateSeguimiento error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el seguimiento',
    };
  }
}

export async function deleteSeguimiento(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, isAdmin } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.seguimiento.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Seguimiento no encontrado' };

    // Regla de propiedad: solo el dueño o admin puede eliminar
    const isOwner = existing.profesionalId === userId;
    const canModify = isAdmin || isOwner;
    if (!canModify) {
      return {
        success: false,
        error:
          'No autorizado — solo el profesional que creó este seguimiento o un administrador puede eliminarlo',
      };
    }

    await prisma.seguimiento.delete({ where: { id } });

    revalidatePath('/seguimientos');
    return { success: true };
  } catch (error) {
    console.error('deleteSeguimiento error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar el seguimiento',
    };
  }
}
