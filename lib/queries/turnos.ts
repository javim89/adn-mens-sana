import { getDb } from '@/lib/tenant/db';
import type { AppRole, Prisma } from '@/lib/generated/prisma/client';
import { esClaveFechaValida, fechaDbDesdeClave, sumarDiasClave } from '@/lib/utils/fecha';
import { getMiembrosDelClub, getNombresDeUsuarios, nombreVisible } from '@/lib/tenant/miembros';

export interface GetTurnosParams {
  profesionalId?: string;
  search?: string;
  /** `'YYYY-MM-DD'` inclusivo (p. ej. `semana.desdeClave`). Inválida = sin borde. */
  desde?: string;
  /** `'YYYY-MM-DD'` INCLUSIVO (p. ej. `semana.hastaClave`). Inválida = sin borde. */
  hasta?: string;
  page?: number; // 0-based
  pageSize?: number;
}

const TURNO_INCLUDE = {
  deportistas: {
    include: {
      deportista: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          categoria: { select: { id: true, nombre: true } },
        },
      },
    },
  },
} satisfies Prisma.TurnoInclude;

export type TurnoRow = Prisma.TurnoGetPayload<{ include: typeof TURNO_INCLUDE }>;

/**
 * Filtro de `turnos.fecha` half-open. La columna se escribe a medianoche UTC
 * (`new Date('YYYY-MM-DD')`), así que el borde superior es `hasta + 1` exclusivo.
 */
export function filtroFechaTurnos(
  desde: string | undefined,
  hasta: string | undefined,
): Prisma.TurnoWhereInput {
  const fecha: Prisma.DateTimeFilter = {};
  if (esClaveFechaValida(desde)) fecha.gte = fechaDbDesdeClave(desde);
  if (esClaveFechaValida(hasta)) fecha.lt = fechaDbDesdeClave(sumarDiasClave(hasta, 1));
  return Object.keys(fecha).length > 0 ? { fecha } : {};
}

function buildWhere(params: GetTurnosParams): Prisma.TurnoWhereInput {
  const search = params.search?.trim();
  return {
    ...(params.profesionalId ? { profesionalId: params.profesionalId } : {}),
    ...filtroFechaTurnos(params.desde, params.hasta),
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
  const db = await getDb();
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 50;
  const where = buildWhere(params);

  const [items, total] = await db.$transaction([
    db.turno.findMany({
      where,
      include: TURNO_INCLUDE,
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
      take: pageSize,
      skip: page * pageSize,
    }),
    db.turno.count({ where }),
  ]);

  return { items, total };
}

export async function getTurnoById(id: string) {
  const db = await getDb();
  return db.turno.findUnique({
    where: { id },
    include: TURNO_INCLUDE,
  });
}

export interface TurnosProfesional {
  profesionalId: string;
  nombre: string;
  /** Rol de la membresía en el club; `null` si ya no es miembro. */
  rol: AppRole | null;
  cantidad: number;
}

/**
 * Cantidad de turnos por profesional en el rango (vista "Por profesional", solo
 * admin: no acota por `profesionalId`). Sin `desde`/`hasta` cuenta todos.
 * Ordenado por cantidad desc y luego por nombre.
 */
export async function getTurnosPorProfesional(
  desde?: string,
  hasta?: string,
): Promise<TurnosProfesional[]> {
  const db = await getDb();
  const grupos = await db.turno.groupBy({
    by: ['profesionalId'],
    where: filtroFechaTurnos(desde, hasta),
    _count: { _all: true },
  });
  if (grupos.length === 0) return [];

  const miembros = await getMiembrosDelClub({ incluirInactivos: true });
  const porId = new Map(miembros.map((m) => [m.userId, m]));
  const faltantes = grupos.map((g) => g.profesionalId).filter((id) => !porId.has(id));
  const nombresFaltantes = faltantes.length > 0 ? await getNombresDeUsuarios(faltantes) : {};

  return grupos
    .map((g) => {
      const miembro = porId.get(g.profesionalId);
      return {
        profesionalId: g.profesionalId,
        nombre: miembro
          ? nombreVisible(miembro)
          : (nombresFaltantes[g.profesionalId] ?? g.profesionalId),
        rol: miembro?.rol ?? null,
        cantidad: g._count._all,
      };
    })
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));
}
