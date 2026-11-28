import { getDb } from '@/lib/tenant/db';
import type { Prisma, EstadoEvento, EstadoDeportista } from '@/lib/generated/prisma/client';
import { toDateString } from '@/lib/queries/calendario';
import { getNombresDeUsuarios } from '@/lib/tenant/miembros';
import { getFotoUrl } from '@/lib/s3';
import { condicionPartido, rivalPartido, type CondicionPartido } from '@/lib/utils/partido';
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

const EQUIPO_SELECT = { select: { nombre: true, esPropio: true } } as const;

const CONVOCATORIA_LIST_INCLUDE = {
  evento: {
    include: {
      dia: { select: { fecha: true } },
      local: EQUIPO_SELECT,
      visitante: EQUIPO_SELECT,
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
  const db = await getDb();
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 50;
  const where = buildWhere(params);

  const [items, total] = await db.$transaction([
    db.convocatoria.findMany({
      where,
      include: CONVOCATORIA_LIST_INCLUDE,
      orderBy: [{ evento: { dia: { fecha: 'desc' } } }],
      take: pageSize,
      skip: page * pageSize,
    }),
    db.convocatoria.count({ where }),
  ]);

  return { items, total };
}

export interface ConvocadoDetail {
  id: string;
  apellido: string;
  nombre: string;
  posicion: string | null;
  estado: EstadoDeportista;
  /** URL firmada de la foto, o `null` sin foto o sin S3. */
  fotoUrl: string | null;
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
  /** Nombre visible del entrenador a cargo (`getNombresDeUsuarios`); el id si no se resuelve. */
  entrenadorNombre: string;
  registradoPor: string;
  disciplina: string;
  categoria: string;
  partido: {
    fecha: string;
    local: string;
    visitante: string;
    estado: EstadoEvento;
    condicion: CondicionPartido | null;
    /** El equipo que no es el propio; `null` si ninguno lo es. */
    rival: string | null;
  };
  convocados: ConvocadoDetail[];
}

export async function getConvocatoriaById(
  id: string,
): Promise<ConvocatoriaDetail | null> {
  const db = await getDb();
  const convocatoria = await db.convocatoria.findUnique({
    where: { id },
    include: {
      evento: {
        include: {
          dia: { select: { fecha: true } },
          local: EQUIPO_SELECT,
          visitante: EQUIPO_SELECT,
        },
      },
      disciplina: { select: { nombre: true } },
      categoria: { select: { nombre: true } },
      convocados: {
        include: {
          deportista: {
            select: {
              id: true,
              apellido: true,
              nombre: true,
              posicion: true,
              estado: true,
              fotoKey: true,
            },
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

  const [nombres, convocados] = await Promise.all([
    getNombresDeUsuarios([convocatoria.entrenadorId]),
    Promise.all(
      convocatoria.convocados.map(async (c) => ({
        id: c.deportista.id,
        apellido: c.deportista.apellido,
        nombre: c.deportista.nombre,
        posicion: c.deportista.posicion,
        estado: c.deportista.estado,
        fotoUrl: await getFotoUrl(c.deportista.fotoKey),
      })),
    ),
  ]);
  const { evento } = convocatoria;

  return {
    id: convocatoria.id,
    eventoTorneoId: convocatoria.eventoTorneoId,
    disciplinaId: convocatoria.disciplinaId,
    categoriaId: convocatoria.categoriaId,
    horaCitacion: convocatoria.horaCitacion,
    lugar: convocatoria.lugar,
    observaciones: convocatoria.observaciones,
    entrenadorId: convocatoria.entrenadorId,
    entrenadorNombre: nombres[convocatoria.entrenadorId] ?? convocatoria.entrenadorId,
    registradoPor: convocatoria.registradoPor,
    disciplina: convocatoria.disciplina.nombre,
    categoria: convocatoria.categoria.nombre,
    partido: {
      fecha: toDateString(evento.dia.fecha),
      local: evento.local.nombre,
      visitante: evento.visitante.nombre,
      estado: evento.estado,
      condicion: condicionPartido(evento),
      rival: rivalPartido(evento),
    },
    convocados,
  };
}

export async function getProximoPartido(
  disciplinaId: string,
  categoriaId: string,
): Promise<ProximoPartido | null> {
  const db = await getDb();
  if (!disciplinaId || !categoriaId) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const evento = await db.eventoTorneo.findFirst({
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
  const db = await getDb();
  return db.deportista.findMany({
    where: { disciplinaId, categoriaId },
    select: { id: true, nombre: true, apellido: true, posicion: true, estado: true },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
}
