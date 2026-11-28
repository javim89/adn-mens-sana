import { getDb } from '@/lib/tenant/db';
import { notFound } from 'next/navigation';
import type {
  EstadoAsistencia,
  EstadoDeportista,
  NivelTriage,
} from '@/lib/generated/prisma/enums';
import type { Prisma } from '@/lib/generated/prisma/client';
import { getNivelTriageActual } from '@/lib/queries/triage';
import type { DeportistaListItem, DeportistaWithRelations } from '@/lib/types/deportistas';
import type { PrioridadSeguimiento, TipoSeguimiento } from '@/lib/types/seguimientos';
import { fechaDbDesdeClave, hoyEnArgentina } from '@/lib/utils/fecha';

export interface GetDeportistasFilters {
  search?: string;
  disciplinaId?: string;
  categoriaId?: string;
  estado?: EstadoDeportista;
  nivelTriage?: NivelTriage | 'SIN_CALCULAR';
  page?: number;
  pageSize?: number;
}

export interface GetDeportistasResult {
  deportistas: DeportistaListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getDeportistas(
  filters: GetDeportistasFilters = {},
): Promise<GetDeportistasResult> {
  const db = await getDb();
  const { search, disciplinaId, categoriaId, estado, nivelTriage, page = 1, pageSize = 20 } = filters;

  // Con filtro de triage hay que resolver los niveles ANTES de paginar, para que
  // el `count` y el `findMany` compartan el mismo `where` y el total sea correcto.
  const nivelPorDeportista = nivelTriage ? await getNivelTriageActual() : null;

  const filtroTriage: Prisma.DeportistaWhereInput = !nivelPorDeportista
    ? {}
    : nivelTriage === 'SIN_CALCULAR'
      ? { id: { notIn: [...nivelPorDeportista.keys()] } }
      : {
          id: {
            in: [...nivelPorDeportista.entries()]
              .filter(([, nivel]) => nivel === nivelTriage)
              .map(([id]) => id),
          },
        };

  const where: Prisma.DeportistaWhereInput = {
    ...(search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' as const } },
            { apellido: { contains: search, mode: 'insensitive' as const } },
            { dni: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(disciplinaId ? { disciplinaId } : {}),
    ...(categoriaId ? { categoriaId } : {}),
    ...(estado ? { estado } : {}),
    ...filtroTriage,
  };

  const [rows, total] = await Promise.all([
    db.deportista.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        disciplinaId: true,
        disciplina: { select: { id: true, nombre: true } },
        categoriaId: true,
        categoria: { select: { id: true, nombre: true } },
        estado: true,
        fotoKey: true,
      },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.deportista.count({ where }),
  ]);

  const niveles = nivelPorDeportista ?? (await getNivelTriageActual(rows.map((d) => d.id)));

  const deportistas: DeportistaListItem[] = rows.map((d) => ({
    ...d,
    nivelTriage: niveles.get(d.id) ?? null,
  }));

  return { deportistas, total, page, pageSize };
}

export async function getDeportistaById(id: string): Promise<DeportistaWithRelations> {
  const db = await getDb();
  const deportista = await db.deportista.findUnique({
    where: { id },
    include: {
      disciplina: { select: { id: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
      clubesAnteriores: true,
      historiaDeportiva: true,
      datosEscolares: true,
      datosSociales: true,
      viviendaFamiliar: { include: { servicios: true } },
      datosFamiliares: true,
      necesidadesApoyo: { include: { apoyosRequeridos: true } },
      datosSalud: {
        include: {
          enfermedadesPreexistentes: true,
          antecedentesEnfermedadesFam: true,
        },
      },
    },
  });

  if (!deportista) {
    notFound();
  }

  return deportista as DeportistaWithRelations;
}

export interface VistaRapidaDeportista {
  seguimientosRecientes: {
    id: string;
    titulo: string;
    fecha: Date;
    prioridad: PrioridadSeguimiento;
    tipoSeguimiento: TipoSeguimiento | null;
  }[];
  /** Asistencias del mes calendario en curso (zona del club). `porcentaje` null sin registros. */
  presentismoMes: { registros: number; asistencias: number; porcentaje: number | null };
  proximoTurno: { id: string; titulo: string; fecha: Date; hora: string; lugar: string } | null;
}

const ESTADOS_PRESENTES_VISTA: readonly EstadoAsistencia[] = [
  'PRESENTE',
  'LLEGO_TARDE',
  'SE_RETIRO_ANTES',
];

/** Primer día del mes de `clave` y primer día del mes siguiente, como claves `YYYY-MM-DD`. */
export function mesDeClave(clave: string): { desdeClave: string; finExclusivoClave: string } {
  const [anio, mes] = clave.split('-').map(Number);
  const siguiente = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    desdeClave: `${anio}-${pad(mes)}-01`,
    finExclusivoClave: `${siguiente.anio}-${pad(siguiente.mes)}-01`,
  };
}

/**
 * Datos de la vista rápida de un deportista en el listado: últimos 3 seguimientos,
 * presentismo del mes (misma definición "no ausente" que el dashboard) y el
 * próximo turno desde hoy. Tres consultas chicas por índice.
 */
export async function getVistaRapidaDeportista(
  deportistaId: string,
  now: Date = new Date(),
  /** Si viene, el próximo turno se limita a los de ese profesional (misma regla que /turnos para no-admin). */
  profesionalId?: string,
): Promise<VistaRapidaDeportista> {
  const db = await getDb();
  const hoy = hoyEnArgentina(now);
  const mes = mesDeClave(hoy);

  const [seguimientos, grupos, turno] = await Promise.all([
    db.seguimiento.findMany({
      where: { deportistas: { some: { deportistaId } } },
      select: { id: true, titulo: true, fecha: true, prioridad: true, tipoSeguimiento: true },
      orderBy: { fecha: 'desc' },
      take: 3,
    }),
    db.asistencia.groupBy({
      by: ['estado'],
      where: {
        deportistaId,
        entrenamiento: {
          fecha: {
            gte: fechaDbDesdeClave(mes.desdeClave),
            lt: fechaDbDesdeClave(mes.finExclusivoClave),
          },
        },
      },
      _count: { _all: true },
    }),
    db.turno.findFirst({
      where: {
        deportistas: { some: { deportistaId } },
        fecha: { gte: fechaDbDesdeClave(hoy) },
        ...(profesionalId ? { profesionalId } : {}),
      },
      select: { id: true, titulo: true, fecha: true, hora: true, lugar: true },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
    }),
  ]);

  let registros = 0;
  let asistencias = 0;
  for (const g of grupos) {
    registros += g._count._all;
    if (ESTADOS_PRESENTES_VISTA.includes(g.estado)) asistencias += g._count._all;
  }

  return {
    seguimientosRecientes: seguimientos,
    presentismoMes: {
      registros,
      asistencias,
      porcentaje: registros === 0 ? null : Math.round((asistencias / registros) * 100),
    },
    proximoTurno: turno,
  };
}
