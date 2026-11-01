'use server';

import { revalidatePath } from 'next/cache';
import { dbDelClub } from '@/lib/tenant/db';
import { mensajeDeError } from '@/lib/tenant/errores';
import type { AppRole } from '@/lib/roles';
import { getContextoClub } from '@/lib/tenant/contexto';
import { getMiembrosDelClub } from '@/lib/tenant/miembros';
import type { TurnoFormData, Profesional } from '@/lib/types/turnos';

const HEALTH_ROLES: AppRole[] = ['medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo'];

/** Usuario y rol en el club activo. Sin club accesible, `userId` es null. */
async function getCallerInfo() {
  const contexto = await getContextoClub();
  if (!contexto) return { userId: null, clubId: null, role: null } as const;
  return { userId: contexto.userId, clubId: contexto.clubId, role: contexto.rol };
}

export async function getProfesionales(): Promise<Profesional[]> {
  const { role } = await getCallerInfo();
  if (role !== 'admin') return [];

  const miembros = await getMiembrosDelClub({ roles: HEALTH_ROLES });
  return miembros.map((m) => ({ id: m.userId, nombre: m.nombre, apellido: m.apellido, rol: m.rol }));
}

export async function createTurno(
  data: TurnoFormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const { userId, clubId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };
    const db = dbDelClub(clubId);

    const profesionalId = role === 'admin' ? data.profesionalId : userId;

    if (!data.titulo?.trim()) return { success: false, error: 'El título es requerido' };
    if (!data.fecha) return { success: false, error: 'La fecha es requerida' };
    if (!data.hora) return { success: false, error: 'La hora es requerida' };
    if (!data.lugar?.trim()) return { success: false, error: 'El lugar es requerido' };
    if (!profesionalId) return { success: false, error: 'El profesional es requerido' };

    const turno = await db.turno.create({
      data: {
        titulo: data.titulo.trim(),
        fecha: new Date(data.fecha),
        hora: data.hora,
        lugar: data.lugar.trim(),
        descripcion: data.descripcion?.trim() || null,
        profesionalId,
        ...(data.deportistaIds.length > 0
          ? {
              deportistas: {
                createMany: {
                  data: data.deportistaIds.map((id) => ({ deportistaId: id })),
                },
              },
            }
          : {}),
      },
    });

    revalidatePath('/turnos');
    return { success: true, id: turno.id };
  } catch (error) {
    console.error('createTurno error:', error);
    return {
      success: false,
      error: mensajeDeError(error, 'Error al crear el turno'),
    };
  }
}

export async function updateTurno(
  id: string,
  data: TurnoFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, clubId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };
    const db = dbDelClub(clubId);

    const existing = await db.turno.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Turno no encontrado' };

    if (role !== 'admin' && existing.profesionalId !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    const profesionalId = role === 'admin' ? data.profesionalId : existing.profesionalId;

    await db.turnoDeportista.deleteMany({ where: { turnoId: id } });

    await db.turno.update({
      where: { id },
      data: {
        titulo: data.titulo.trim(),
        fecha: new Date(data.fecha),
        hora: data.hora,
        lugar: data.lugar.trim(),
        descripcion: data.descripcion?.trim() || null,
        profesionalId,
        ...(data.deportistaIds.length > 0
          ? {
              deportistas: {
                createMany: {
                  data: data.deportistaIds.map((did) => ({ deportistaId: did })),
                },
              },
            }
          : {}),
      },
    });

    revalidatePath('/turnos');
    return { success: true };
  } catch (error) {
    console.error('updateTurno error:', error);
    return {
      success: false,
      error: mensajeDeError(error, 'Error al actualizar el turno'),
    };
  }
}

export async function deleteTurno(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, clubId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };
    const db = dbDelClub(clubId);

    const existing = await db.turno.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Turno no encontrado' };

    if (role !== 'admin' && existing.profesionalId !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    await db.turno.delete({ where: { id } });

    revalidatePath('/turnos');
    return { success: true };
  } catch (error) {
    console.error('deleteTurno error:', error);
    return {
      success: false,
      error: mensajeDeError(error, 'Error al eliminar el turno'),
    };
  }
}
