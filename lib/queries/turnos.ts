import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';

export interface GetTurnosParams {
  profesionalId?: string;
  search?: string;
  page?: number; // 0-based
  pageSize?: number;
}

const TURNO_INCLUDE = {
  deportistas: {
    include: {
      deportista: { select: { id: true, nombre: true, apellido: true } },
    },
  },
} satisfies Prisma.TurnoInclude;

export type TurnoRow = Prisma.TurnoGetPayload<{ include: typeof TURNO_INCLUDE }>;

function buildWhere(params: GetTurnosParams): Prisma.TurnoWhereInput {
  const search = params.search?.trim();
  return {
    ...(params.profesionalId ? { profesionalId: params.profesionalId } : {}),
    ...(search
      ? {
          OR: [
            { titulo: { contains: search, mode: 'insensitive' } },
            { lugar: { contains: search, mode: 'insensitive' } },
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
        }
      : {}),
  };
}

/**
 * Devuelve una página de turnos junto con el total de filas que matchean el
 * filtro (para paginación server-side).
 */
export async function getTurnos(
  params: GetTurnosParams = {},
): Promise<{ items: TurnoRow[]; total: number }> {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 50;
  const where = buildWhere(params);

  const [items, total] = await prisma.$transaction([
    prisma.turno.findMany({
      where,
      include: TURNO_INCLUDE,
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
      take: pageSize,
      skip: page * pageSize,
    }),
    prisma.turno.count({ where }),
  ]);

  return { items, total };
}

export async function getTurnoById(id: string) {
  return prisma.turno.findUnique({
    where: { id },
    include: TURNO_INCLUDE,
  });
}
