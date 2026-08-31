'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

type ActionResult = { success: true } | { success: false; error: string };

function parseDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function revalidateDeportista(deportistaId: string) {
  revalidatePath(`/deportistas/${deportistaId}`);
  revalidatePath('/deportistas');
}

// ---------------------------------------------------------------------------
// crearTransicionDivision
// ---------------------------------------------------------------------------

export async function crearTransicionDivision(input: {
  deportistaId: string;
  categoriaId: string | null;
  disciplinaId: string | null;
  fecha: string; // YYYY-MM-DD
}): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'No autorizado' };

    const clerkUser = await currentUser();
    const role = String(clerkUser?.publicMetadata?.role ?? '');
    if (role !== 'admin') return { success: false, error: 'No autorizado' };

    const fecha = parseDate(input.fecha);
    if (!fecha) return { success: false, error: 'La fecha es inválida' };

    const deportista = await prisma.deportista.findUnique({
      where: { id: input.deportistaId },
      select: { id: true },
    });
    if (!deportista) return { success: false, error: 'Deportista no encontrado' };

    const periodoAbierto = await prisma.pasoPorDivision.findFirst({
      where: { deportistaId: input.deportistaId, hasta: null },
      orderBy: { desde: 'desc' },
    });

    if (periodoAbierto && fecha <= periodoAbierto.desde) {
      return {
        success: false,
        error: 'La fecha del cambio debe ser posterior al inicio del período actual',
      };
    }

    await prisma.$transaction(async (tx) => {
      if (periodoAbierto) {
        await tx.pasoPorDivision.update({
          where: { id: periodoAbierto.id },
          data: { hasta: fecha },
        });
      }

      await tx.pasoPorDivision.create({
        data: {
          deportistaId: input.deportistaId,
          categoriaId: input.categoriaId,
          disciplinaId: input.disciplinaId,
          desde: fecha,
          hasta: null,
        },
      });

      await tx.deportista.update({
        where: { id: input.deportistaId },
        data: {
          categoriaId: input.categoriaId,
          disciplinaId: input.disciplinaId,
        },
      });
    });

    revalidateDeportista(input.deportistaId);
    return { success: true };
  } catch (error) {
    console.error('crearTransicionDivision error:', error);
    return { success: false, error: 'Error al registrar el cambio de división' };
  }
}

// ---------------------------------------------------------------------------
// updatePasoPorDivision
// ---------------------------------------------------------------------------

export async function updatePasoPorDivision(input: {
  id: string;
  categoriaId: string | null;
  disciplinaId: string | null;
  desde: string; // YYYY-MM-DD
  hasta: string | null; // YYYY-MM-DD o null
}): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'No autorizado' };

    const clerkUser = await currentUser();
    const role = String(clerkUser?.publicMetadata?.role ?? '');
    if (role !== 'admin') return { success: false, error: 'No autorizado' };

    const desde = parseDate(input.desde);
    if (!desde) return { success: false, error: 'La fecha de inicio es inválida' };

    let hasta: Date | null = null;
    if (input.hasta) {
      hasta = parseDate(input.hasta);
      if (!hasta) return { success: false, error: 'La fecha de fin es inválida' };
      if (hasta <= desde) {
        return { success: false, error: 'La fecha de fin debe ser posterior al inicio' };
      }
    }

    const existing = await prisma.pasoPorDivision.findUnique({
      where: { id: input.id },
      select: { deportistaId: true },
    });
    if (!existing) return { success: false, error: 'Período no encontrado' };

    await prisma.pasoPorDivision.update({
      where: { id: input.id },
      data: {
        categoriaId: input.categoriaId,
        disciplinaId: input.disciplinaId,
        desde,
        hasta,
      },
    });

    revalidateDeportista(existing.deportistaId);
    return { success: true };
  } catch (error) {
    console.error('updatePasoPorDivision error:', error);
    return { success: false, error: 'Error al actualizar el período' };
  }
}

// ---------------------------------------------------------------------------
// deletePasoPorDivision
// ---------------------------------------------------------------------------

export async function deletePasoPorDivision(id: string): Promise<ActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'No autorizado' };

    const clerkUser = await currentUser();
    const role = String(clerkUser?.publicMetadata?.role ?? '');
    if (role !== 'admin') return { success: false, error: 'No autorizado' };

    const existing = await prisma.pasoPorDivision.findUnique({
      where: { id },
      select: { deportistaId: true },
    });
    if (!existing) return { success: false, error: 'Período no encontrado' };

    await prisma.pasoPorDivision.delete({ where: { id } });

    revalidateDeportista(existing.deportistaId);
    return { success: true };
  } catch (error) {
    console.error('deletePasoPorDivision error:', error);
    return { success: false, error: 'Error al eliminar el período' };
  }
}
