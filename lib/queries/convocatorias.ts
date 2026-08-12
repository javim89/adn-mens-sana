import { prisma } from '@/lib/db';
import type { Prisma, EstadoEvento } from '@/lib/generated/prisma/client';
import { toDateString } from '@/lib/queries/calendario';
import type {
  ProximoPartido,
  DeportistaConvocable,
} from '@/lib/types/convocatorias';

export interface GetConvocatoriasParams {
  page?: number; // 0-based
  pageSize?: number;
  disciplinaId?: string;
  categoriaId?: string;
  callerId: string;
  isAdmin: boolean;
}

const CONVOCATORIA_LIST_INCLUDE = {
  evento: {
    include: {
      dia: { select: { fecha: true } },
      local: { select: { nombre: true } },
      visitante: { select: { nombre: true } },
    },
  },
  disciplina: { select: { nombre: true } },
  categoria: { select: { nombre: true } },
  _count: { select: { convocados: true } },
} satisfies Prisma.ConvocatoriaInclude;

export type ConvocatoriaRow = Prisma.ConvocatoriaGetPayload<{
  include: typeof CONVOCATORIA_LIST_INCLUDE;
}>;

function buildWhere(params: GetConvocatoriasParams): Prisma.ConvocatoriaWhereInput {
  return {
    ...(params.isAdmin ? {} : { entrenadorId: params.callerId }),
    ...(params.disciplinaId ? { disciplinaId: params.disciplinaId } : {}),
    ...(params.categoriaId ? { categoriaId: params.categoriaId } : {}),
  };
}

export async function getConvocatorias(
  params: GetConvocatoriasParams,
): Promise<{ items: ConvocatoriaRow[]; total: number }> {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 50;
  const where = buildWhere(params);

  const [items, total] = await prisma.$transaction([
    prisma.convocatoria.findMany({
      where,
      include: CONVOCATORIA_LIST_INCLUDE,
      orderBy: [{ evento: { dia: { fecha: 'desc' } } }],
      take: pageSize,
      skip: page * pageSize,
    }),
    prisma.convocatoria.count({ where }),
  ]);

  return { items, total };
}

export interface ConvocadoDetail {
  id: string;
  apellido: string;
  nombre: string;
  posicion: string | null;
}

export interface ConvocatoriaDetail {
  id: string;
  eventoTorneoId: string;
  disciplinaId: string;
  categoriaId: string;
  horaCitacion: string | null;
  lugar: string | null;
  observaciones: string | null;
  entrenadorId: string;
  registradoPor: string;
  partido: {
    fecha: string;
    local: string;
    visitante: string;
    estado: EstadoEvento;
  };
  convocados: ConvocadoDetail[];
}

export async function getConvocatoriaById(
  id: string,
): Promise<ConvocatoriaDetail | null> {
  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id },
    include: {
      evento: {
        include: {
          dia: { select: { fecha: true } },
          local: { select: { nombre: true } },
          visitante: { select: { nombre: true } },
        },
      },
      convocados: {
        include: {
          deportista: {
            select: { id: true, apellido: true, nombre: true, posicion: true },
          },
        },
        orderBy: [
          { deportista: { apellido: 'asc' } },
          { deportista: { nombre: 'asc' } },
        ],
      },
    },
  });

  if (!convocatoria) return null;

  return {
    id: convocatoria.id,
    eventoTorneoId: convocatoria.eventoTorneoId,
    disciplinaId: convocatoria.disciplinaId,
    categoriaId: convocatoria.categoriaId,
    horaCitacion: convocatoria.horaCitacion,
    lugar: convocatoria.lugar,
    observaciones: convocatoria.observaciones,
    entrenadorId: convocatoria.entrenadorId,
    registradoPor: convocatoria.registradoPor,
    partido: {
      fecha: toDateString(convocatoria.evento.dia.fecha),
      local: convocatoria.evento.local.nombre,
      visitante: convocatoria.evento.visitante.nombre,
      estado: convocatoria.evento.estado,
    },
    convocados: convocatoria.convocados.map((c) => ({
      id: c.deportista.id,
      apellido: c.deportista.apellido,
      nombre: c.deportista.nombre,
      posicion: c.deportista.posicion,
    })),
  };
}

export async function getProximoPartido(
  disciplinaId: string,
  categoriaId: string,
): Promise<ProximoPartido | null> {
  if (!disciplinaId || !categoriaId) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const evento = await prisma.eventoTorneo.findFirst({
    where: {
      categoriaId,
      estado: { not: 'SUSPENDIDO' },
      dia: { fecha: { gte: hoy } },
    },
    include: {
      dia: { select: { fecha: true } },
      local: { select: { nombre: true } },
      visitante: { select: { nombre: true } },
    },
    orderBy: [{ dia: { fecha: 'asc' } }],
  });

  if (!evento) return null;

  return {
    eventoTorneoId: evento.id,
    fecha: toDateString(evento.dia.fecha),
    local: evento.local.nombre,
    visitante: evento.visitante.nombre,
    estado: evento.estado,
  };
}

export async function getDeportistasParaConvocar(
  disciplinaId: string,
  categoriaId: string,
): Promise<DeportistaConvocable[]> {
  return prisma.deportista.findMany({
    where: { disciplinaId, categoriaId, estado: 'ACTIVO' },
    select: { id: true, nombre: true, apellido: true, posicion: true },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
}
