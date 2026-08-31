import { prisma } from '@/lib/db';
import { toDateString } from '@/lib/queries/calendario';
import { getSeguimientos } from '@/lib/queries/seguimientos';
import type {
  PeriodoDivision,
  Trayectoria,
  TrayectoriaEvento,
} from '@/lib/types/trayectoria';

/**
 * Períodos de división del deportista, ordenados por `desde` ascendente,
 * con nombres de categoría/disciplina resueltos y fechas serializadas a YYYY-MM-DD.
 */
export async function getPasosPorDivision(
  deportistaId: string,
): Promise<PeriodoDivision[]> {
  const pasos = await prisma.pasoPorDivision.findMany({
    where: { deportistaId },
    include: {
      categoria: { select: { id: true, nombre: true } },
      disciplina: { select: { id: true, nombre: true } },
    },
    orderBy: { desde: 'asc' },
  });

  return pasos.map((p) => ({
    id: p.id,
    categoriaId: p.categoria?.id ?? null,
    categoriaNombre: p.categoria?.nombre ?? null,
    disciplinaId: p.disciplina?.id ?? null,
    disciplinaNombre: p.disciplina?.nombre ?? null,
    desde: toDateString(p.desde),
    hasta: p.hasta ? toDateString(p.hasta) : null,
  }));
}

async function getEventosSeguimiento(
  deportistaId: string,
): Promise<TrayectoriaEvento[]> {
  const { items } = await getSeguimientos({ deportistaId, pageSize: 500 });

  return items.map((s) => ({
    id: s.id,
    tipo: 'SEGUIMIENTO' as const,
    fecha: toDateString(s.fecha),
    titulo: s.titulo,
    detalle: s.descripcion,
    href: `/seguimientos/${s.id}`,
    meta: {
      tipoSeguimiento: s.tipoSeguimiento,
      prioridad: s.prioridad,
    },
  }));
}

async function getEventosConvocatoria(
  deportistaId: string,
): Promise<TrayectoriaEvento[]> {
  const convocatorias = await prisma.convocatoriaDeportista.findMany({
    where: { deportistaId },
    include: {
      convocatoria: {
        include: {
          evento: {
            include: {
              dia: { select: { fecha: true } },
              local: { select: { nombre: true } },
              visitante: { select: { nombre: true } },
            },
          },
          categoria: { select: { nombre: true } },
          disciplina: { select: { nombre: true } },
        },
      },
    },
  });

  return convocatorias.map((c) => {
    const { convocatoria } = c;
    const { evento } = convocatoria;
    return {
      id: c.id,
      tipo: 'CONVOCATORIA' as const,
      fecha: toDateString(evento.dia.fecha),
      titulo: `${evento.local.nombre} vs ${evento.visitante.nombre}`,
      detalle: convocatoria.observaciones,
      href: `/convocatorias/${convocatoria.id}`,
      meta: {
        estado: evento.estado,
        disciplinaNombre: convocatoria.disciplina.nombre,
        categoriaNombre: convocatoria.categoria.nombre,
      },
    };
  });
}

async function getEventosPresentismo(
  deportistaId: string,
): Promise<TrayectoriaEvento[]> {
  const asistencias = await prisma.asistencia.findMany({
    where: { deportistaId },
    include: {
      entrenamiento: {
        include: {
          categoria: { select: { nombre: true } },
          disciplina: { select: { nombre: true } },
        },
      },
    },
  });

  return asistencias.map((a) => ({
    id: a.id,
    tipo: 'PRESENTISMO' as const,
    fecha: toDateString(a.entrenamiento.fecha),
    titulo: a.entrenamiento.tipoSesion,
    detalle: a.notas,
    href: `/presentismo/${a.entrenamientoId}`,
    meta: {
      estado: a.estado,
      tipoSesion: a.entrenamiento.tipoSesion,
      disciplinaNombre: a.entrenamiento.disciplina.nombre,
      categoriaNombre: a.entrenamiento.categoria.nombre,
    },
  }));
}

async function getEventosTurno(
  deportistaId: string,
): Promise<TrayectoriaEvento[]> {
  const turnos = await prisma.turnoDeportista.findMany({
    where: { deportistaId },
    include: { turno: true },
  });

  return turnos.map((t) => ({
    id: t.id,
    tipo: 'TURNO' as const,
    fecha: toDateString(t.turno.fecha),
    titulo: t.turno.titulo,
    detalle: t.turno.descripcion,
    href: null,
    meta: {
      hora: t.turno.hora,
      lugar: t.turno.lugar,
    },
  }));
}

async function getEventosHistoria(
  deportistaId: string,
): Promise<TrayectoriaEvento[]> {
  const historias = await prisma.historiaDeportiva.findMany({
    where: { deportistaId },
  });

  return historias.map((h) => ({
    id: h.id,
    tipo: 'HISTORIA' as const,
    fecha: toDateString(h.fecha),
    titulo: h.descripcion,
    detalle: null,
    href: null,
  }));
}

/**
 * Reúne los períodos de división y todos los eventos del deportista
 * (seguimientos, convocatorias, presentismo, turnos e historia deportiva),
 * normalizados al shape común `TrayectoriaEvento`. No agrupa: la agrupación
 * por período la resuelve el frontend.
 */
export async function getTrayectoria(
  deportistaId: string,
): Promise<Trayectoria> {
  const [periodos, seguimientos, convocatorias, presentismo, turnos, historia] =
    await Promise.all([
      getPasosPorDivision(deportistaId),
      getEventosSeguimiento(deportistaId),
      getEventosConvocatoria(deportistaId),
      getEventosPresentismo(deportistaId),
      getEventosTurno(deportistaId),
      getEventosHistoria(deportistaId),
    ]);

  const eventos: TrayectoriaEvento[] = [
    ...seguimientos,
    ...convocatorias,
    ...presentismo,
    ...turnos,
    ...historia,
  ];

  return { periodos, eventos };
}
