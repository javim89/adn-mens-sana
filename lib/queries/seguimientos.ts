import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import type { PrioridadSeguimiento, TipoSeguimiento } from '@/lib/types/seguimientos';

export interface GetSeguimientosParams {
  profesionalId?: string;
  deportistaId?: string;
  prioridad?: PrioridadSeguimiento;
  tipoSeguimiento?: TipoSeguimiento;
  disciplinaId?: string;
  categoriaId?: string;
  search?: string;
  page?: number; // 0-based
  pageSize?: number;
}

const SEGUIMIENTO_SELECT = {
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
  deportistas: {
    select: { deportista: { select: { id: true, nombre: true, apellido: true } } },
    orderBy: { deportista: { apellido: 'asc' } },
  },
} satisfies Prisma.SeguimientoSelect;

export type SeguimientoRow = Prisma.SeguimientoGetPayload<{
  select: typeof SEGUIMIENTO_SELECT;
}>;

function buildWhere(params: GetSeguimientosParams): Prisma.SeguimientoWhereInput {
  const search = params.search?.trim();

  // Cada filtro que referencia la relación N:M `deportistas` se agrega como una
  // entrada independiente del array `AND`. Si se colapsaran en un solo objeto
  // literal, la clave `deportistas` de un filtro pisaría a la del otro (p. ej.
  // filtrar por deportista puntual + disciplina/categoría a la vez perdería uno).
  const and: Prisma.SeguimientoWhereInput[] = [];

  if (params.deportistaId) {
    and.push({ deportistas: { some: { deportistaId: params.deportistaId } } });
  }

  if (params.disciplinaId || params.categoriaId) {
    and.push({
      deportistas: {
        some: {
          deportista: {
            is: {
              ...(params.disciplinaId ? { disciplinaId: params.disciplinaId } : {}),
              ...(params.categoriaId ? { categoriaId: params.categoriaId } : {}),
            },
          },
        },
      },
    });
  }

  if (search) {
    and.push({
      OR: [
        { titulo: { contains: search, mode: 'insensitive' } },
        {
          deportistas: {
            some: {
              deportista: {
                is: {
                  OR: [
                    { nombre: { contains: search, mode: 'insensitive' } },
                    { apellido: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        },
      ],
    });
  }

  return {
    ...(params.profesionalId ? { profesionalId: params.profesionalId } : {}),
    ...(params.prioridad ? { prioridad: params.prioridad } : {}),
    ...(params.tipoSeguimiento ? { tipoSeguimiento: params.tipoSeguimiento } : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

/**
 * Devuelve una página de seguimientos junto con el total de filas que matchean
 * el filtro (para paginación server-side).
 */
export async function getSeguimientos(
  params: GetSeguimientosParams = {},
): Promise<{ items: SeguimientoRow[]; total: number }> {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 50;
  const where = buildWhere(params);

  const [items, total] = await prisma.$transaction([
    prisma.seguimiento.findMany({
      where,
      select: SEGUIMIENTO_SELECT,
      orderBy: [{ fecha: 'desc' }],
      take: pageSize,
      skip: page * pageSize,
    }),
    prisma.seguimiento.count({ where }),
  ]);

  return { items, total };
}

export async function getSeguimientoById(id: string) {
  return prisma.seguimiento.findUnique({
    where: { id },
    include: {
      deportistas: {
        select: { deportista: { select: { id: true, nombre: true, apellido: true } } },
        orderBy: { deportista: { apellido: 'asc' } },
      },
      traumatologia: true,
      historiaClinica: true,
      evaluacionPsicologica: true,
      evaluacionCardiologica: true,
      antropometria: true,
    },
  });
}
