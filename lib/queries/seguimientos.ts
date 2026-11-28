import { getDb } from '@/lib/tenant/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import type { PrioridadSeguimiento, TipoSeguimiento } from '@/lib/types/seguimientos';

export interface GetSeguimientosParams {
  profesionalId?: string;
  deportistaId?: string;
  /** Uno o varios valores (`{ in }`). Un array vacío es "sin filtro". */
  prioridad?: PrioridadSeguimiento | readonly PrioridadSeguimiento[];
  /** `GENERICO` incluye también los `null` (seguimientos viejos sin tipo). */
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

export const PRIORIDADES_SEGUIMIENTO: readonly PrioridadSeguimiento[] = [
  'BAJA',
  'MEDIA',
  'ALTA',
  'URGENTE',
];

export const TIPOS_SEGUIMIENTO: readonly TipoSeguimiento[] = [
  'GENERICO',
  'TRAUMATOLOGIA',
  'HISTORIA_CLINICA',
  'EVALUACION_PSICOLOGICA',
  'EVALUACION_CARDIOLOGICA',
  'ANTROPOMETRIA',
];

type SearchParamValue = string | string[] | undefined;

/**
 * Prioridades pedidas en la URL. Acepta el parámetro repetido
 * (`?prioridad=ALTA&prioridad=MEDIA`), separado por comas (`?prioridad=ALTA,MEDIA`)
 * o un solo valor, como lo arman los links del dashboard. Descarta lo inválido y
 * los duplicados; conserva el orden canónico BAJA → URGENTE.
 */
export function parsePrioridades(valor: SearchParamValue): PrioridadSeguimiento[] {
  const crudos = (Array.isArray(valor) ? valor : valor ? [valor] : [])
    .flatMap((v) => v.split(','))
    .map((v) => v.trim().toUpperCase());
  return PRIORIDADES_SEGUIMIENTO.filter((p) => crudos.includes(p));
}

/** Tipo de seguimiento pedido en la URL (`?tipo=`), o `undefined` si falta o es inválido. */
export function parseTipoSeguimiento(valor: SearchParamValue): TipoSeguimiento | undefined {
  const crudo = (Array.isArray(valor) ? valor[0] : valor)?.trim().toUpperCase();
  return TIPOS_SEGUIMIENTO.find((t) => t === crudo);
}

function filtroPrioridad(
  prioridad: GetSeguimientosParams['prioridad'],
): Prisma.SeguimientoWhereInput {
  if (!prioridad) return {};
  if (typeof prioridad === 'string') return { prioridad };
  if (prioridad.length === 0) return {};
  if (prioridad.length === 1) return { prioridad: prioridad[0] };
  return { prioridad: { in: [...prioridad] } };
}

function filtroTipo(tipo: TipoSeguimiento | undefined): Prisma.SeguimientoWhereInput[] {
  if (!tipo) return [];
  // Los seguimientos sin tipo se muestran y se cuentan como GENÉRICO.
  if (tipo === 'GENERICO') {
    return [{ OR: [{ tipoSeguimiento: 'GENERICO' }, { tipoSeguimiento: null }] }];
  }
  return [{ tipoSeguimiento: tipo }];
}

export function buildWhere(params: GetSeguimientosParams): Prisma.SeguimientoWhereInput {
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

  and.push(...filtroTipo(params.tipoSeguimiento));

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
    ...filtroPrioridad(params.prioridad),
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
  const db = await getDb();
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 50;
  const where = buildWhere(params);

  const [items, total] = await db.$transaction([
    db.seguimiento.findMany({
      where,
      select: SEGUIMIENTO_SELECT,
      orderBy: [{ fecha: 'desc' }],
      take: pageSize,
      skip: page * pageSize,
    }),
    db.seguimiento.count({ where }),
  ]);

  return { items, total };
}

export type FiltrosConteoTipo = Omit<
  GetSeguimientosParams,
  'page' | 'pageSize' | 'tipoSeguimiento'
>;

export interface ConteoPorTipoSeguimiento {
  /** Los 6 tipos, con zero-fill. Los seguimientos sin tipo suman en GENERICO. */
  porTipo: Record<TipoSeguimiento, number>;
  total: number;
}

/**
 * Cuántos seguimientos hay de cada tipo con los mismos filtros que el listado
 * (prioridad, profesional, disciplina, categoría, búsqueda), para que cada fila
 * del panel coincida con la lista que abre su link. El filtro de tipo se ignora a
 * propósito: el panel es justamente el desglose por tipo.
 */
export async function getConteoPorTipoSeguimiento(
  filtros: FiltrosConteoTipo = {},
): Promise<ConteoPorTipoSeguimiento> {
  const db = await getDb();
  const grupos = await db.seguimiento.groupBy({
    by: ['tipoSeguimiento'],
    where: buildWhere({ ...filtros, tipoSeguimiento: undefined }),
    _count: { _all: true },
  });

  const porTipo = Object.fromEntries(TIPOS_SEGUIMIENTO.map((t) => [t, 0])) as Record<
    TipoSeguimiento,
    number
  >;
  let total = 0;
  for (const g of grupos) {
    const tipo = g.tipoSeguimiento ?? 'GENERICO';
    if (!(tipo in porTipo)) continue;
    porTipo[tipo] += g._count._all;
    total += g._count._all;
  }
  return { porTipo, total };
}

/** Total de seguimientos en los que participa un deportista (tarjeta de la ficha). */
export async function getConteoSeguimientosDeportista(deportistaId: string): Promise<number> {
  const db = await getDb();
  return db.seguimiento.count({ where: buildWhere({ deportistaId }) });
}

export async function getSeguimientoById(id: string) {
  const db = await getDb();
  return db.seguimiento.findUnique({
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
