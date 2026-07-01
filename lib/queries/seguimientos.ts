import { prisma } from '@/lib/db';
import type { PrioridadSeguimiento } from '@/lib/types/seguimientos';

export interface GetSeguimientosParams {
  profesionalId?: string;
  deportistaId?: string;
  prioridad?: PrioridadSeguimiento;
}

export async function getSeguimientos(params: GetSeguimientosParams = {}) {
  return prisma.seguimiento.findMany({
    where: {
      ...(params.profesionalId ? { profesionalId: params.profesionalId } : {}),
      ...(params.deportistaId ? { deportistaId: params.deportistaId } : {}),
      ...(params.prioridad ? { prioridad: params.prioridad } : {}),
    },
    include: {
      deportista: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: [{ fecha: 'desc' }],
  });
}

export async function getSeguimientoById(id: string) {
  return prisma.seguimiento.findUnique({
    where: { id },
    include: {
      deportista: { select: { id: true, nombre: true, apellido: true } },
    },
  });
}
