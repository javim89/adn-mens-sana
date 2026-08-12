import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import type { TipoSesion } from '@/lib/types/presentismo';

export interface GetEntrenamientosParams {
  page?: number; // 0-based
  pageSize?: number;
  disciplinaId?: string;
  categoriaId?: string;
  tipoSesion?: TipoSesion;
  desde?: string;
  hasta?: string;
  callerId: string;
  isAdmin: boolean;
}

const ENTRENAMIENTO_LIST_INCLUDE = {
  disciplina: { select: { nombre: true } },
  categoria: { select: { nombre: true } },
  _count: { select: { asistencias: true } },
} satisfies Prisma.EntrenamientoInclude;

type EntrenamientoListRow = Prisma.EntrenamientoGetPayload<{
  include: typeof ENTRENAMIENTO_LIST_INCLUDE;
}>;

export type EntrenamientoRow = EntrenamientoListRow & { presentes: number };

function buildWhere(params: GetEntrenamientosParams): Prisma.EntrenamientoWhereInput {
  const fecha: Prisma.DateTimeFilter = {};
  if (params.desde) fecha.gte = new Date(params.desde);
  if (params.hasta) fecha.lte = new Date(params.hasta);

  return {
    ...(params.isAdmin ? {} : { entrenadorId: params.callerId }),
    ...(params.disciplinaId ? { disciplinaId: params.disciplinaId } : {}),
    ...(params.categoriaId ? { categoriaId: params.categoriaId } : {}),
    ...(params.tipoSesion ? { tipoSesion: params.tipoSesion } : {}),
    ...(params.desde || params.hasta ? { fecha } : {}),
  };
}

export async function getEntrenamientos(
  params: GetEntrenamientosParams,
): Promise<{ items: EntrenamientoRow[]; total: number }> {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 50;
  const where = buildWhere(params);

  const [items, total] = await prisma.$transaction([
    prisma.entrenamiento.findMany({
      where,
      include: ENTRENAMIENTO_LIST_INCLUDE,
      orderBy: [{ fecha: 'desc' }],
      take: pageSize,
      skip: page * pageSize,
    }),
    prisma.entrenamiento.count({ where }),
  ]);

  if (items.length === 0) return { items: [], total };

  const presentesPorEntrenamiento = await prisma.asistencia.groupBy({
    by: ['entrenamientoId'],
    where: {
      entrenamientoId: { in: items.map((i) => i.id) },
      estado: 'PRESENTE',
    },
    _count: { _all: true },
  });

  const presentesMap = new Map(
    presentesPorEntrenamiento.map((g) => [g.entrenamientoId, g._count._all]),
  );

  return {
    items: items.map((i) => ({ ...i, presentes: presentesMap.get(i.id) ?? 0 })),
    total,
  };
}

const ENTRENAMIENTO_DETAIL_INCLUDE = {
  disciplina: { select: { id: true, nombre: true } },
  categoria: { select: { id: true, nombre: true } },
  asistencias: {
    include: {
      deportista: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: [{ deportista: { apellido: 'asc' } }, { deportista: { nombre: 'asc' } }],
  },
} satisfies Prisma.EntrenamientoInclude;

export type EntrenamientoDetail = Prisma.EntrenamientoGetPayload<{
  include: typeof ENTRENAMIENTO_DETAIL_INCLUDE;
}>;

export async function getEntrenamientoById(id: string): Promise<EntrenamientoDetail | null> {
  return prisma.entrenamiento.findUnique({
    where: { id },
    include: ENTRENAMIENTO_DETAIL_INCLUDE,
  });
}

export interface DeportistaAsistenciaItem {
  id: string;
  nombre: string;
  apellido: string;
}

export async function getDeportistasParaAsistencia(
  disciplinaId: string,
  categoriaId: string,
): Promise<DeportistaAsistenciaItem[]> {
  return prisma.deportista.findMany({
    where: { disciplinaId, categoriaId, estado: 'ACTIVO' },
    select: { id: true, nombre: true, apellido: true },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
}
