'use server';

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import type { TurnoFormData, Profesional } from '@/lib/types/turnos';

const HEALTH_ROLES = ['medico', 'kinesiologo', 'nutricionista', 'psicologo', 'cardiologo'];

async function getCallerInfo() {
  const { userId } = await auth();
  if (!userId) return { userId: null, role: null };
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');
  return { userId, role };
}

export async function getProfesionales(): Promise<Profesional[]> {
  const { role } = await getCallerInfo();
  if (role !== 'admin') return [];

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

export async function createTurno(
  data: TurnoFormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const { userId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const profesionalId = role === 'admin' ? data.profesionalId : userId;

    if (!data.titulo?.trim()) return { success: false, error: 'El título es requerido' };
    if (!data.fecha) return { success: false, error: 'La fecha es requerida' };
    if (!data.hora) return { success: false, error: 'La hora es requerida' };
    if (!data.lugar?.trim()) return { success: false, error: 'El lugar es requerido' };
    if (!profesionalId) return { success: false, error: 'El profesional es requerido' };

    const turno = await prisma.turno.create({
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
      error: error instanceof Error ? error.message : 'Error al crear el turno',
    };
  }
}

export async function updateTurno(
  id: string,
  data: TurnoFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.turno.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Turno no encontrado' };

    if (role !== 'admin' && existing.profesionalId !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    const profesionalId = role === 'admin' ? data.profesionalId : existing.profesionalId;

    await prisma.turnoDeportista.deleteMany({ where: { turnoId: id } });

    await prisma.turno.update({
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
      error: error instanceof Error ? error.message : 'Error al actualizar el turno',
    };
  }
}

export async function deleteTurno(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId, role } = await getCallerInfo();
    if (!userId) return { success: false, error: 'No autorizado' };

    const existing = await prisma.turno.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Turno no encontrado' };

    if (role !== 'admin' && existing.profesionalId !== userId) {
      return { success: false, error: 'Acceso denegado' };
    }

    await prisma.turno.delete({ where: { id } });

    revalidatePath('/turnos');
    return { success: true };
  } catch (error) {
    console.error('deleteTurno error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar el turno',
    };
  }
}
