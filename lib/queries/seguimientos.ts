import { prisma } from '@/lib/db';
import type { PrioridadSeguimiento, TipoSeguimiento } from '@/lib/types/seguimientos';

export interface GetSeguimientosParams {
  profesionalId?: string;
  deportistaId?: string;
  prioridad?: PrioridadSeguimiento;
  tipoSeguimiento?: TipoSeguimiento;
}

export async function getSeguimientos(params: GetSeguimientosParams = {}) {
  return prisma.seguimiento.findMany({
    where: {
      ...(params.profesionalId ? { profesionalId: params.profesionalId } : {}),
      ...(params.deportistaId ? { deportistaId: params.deportistaId } : {}),
      ...(params.prioridad ? { prioridad: params.prioridad } : {}),
      ...(params.tipoSeguimiento ? { tipoSeguimiento: params.tipoSeguimiento } : {}),
    },
    select: {
      id: true,
      fecha: true,
      titulo: true,
      descripcion: true,
      recomendaciones: true,
      resultadosEvaluacion: true,
      prioridad: true,
      proximaCita: true,
      alertaSeguimiento: true,
      tipoSeguimiento: true,
      profesionalId: true,
      deportistaId: true,
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
      traumatologia: true,
      historiaClinica: true,
      evaluacionPsicologica: true,
      evaluacionCardiologica: true,
    },
  });
}
