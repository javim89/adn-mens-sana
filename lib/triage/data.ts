import { prisma } from '@/lib/db';
import type { TriageInput } from '@/lib/types/triage';

/**
 * Ventana de los 7 días previos a `now` (inclusive del extremo inferior,
 * exclusiva del superior) usada para contar ausencias de la semana evaluada.
 */
export function weekWindow(now: Date): { from: Date; to: Date } {
  const to = now;
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to };
}

const DEPORTISTA_SELECT = {
  id: true,
  estado: true,
  ciudad: true,
  nacionalidad: true,
  vivePensionClub: true,
  vivePensionExterna: true,
  disciplinaId: true,
  categoriaId: true,
  datosSalud: { select: { obraSocial: true, historialLesiones: true } },
  datosSociales: { select: { trabaja: true, situacionLaboralHogar: true } },
  datosFamiliares: { select: { padreNacionalidad: true, madreNacionalidad: true } },
  necesidadesApoyo: {
    select: {
      dificultadAlimentacion: true,
      recibeVianda: true,
      apoyosRequeridos: { select: { tipo: true } },
    },
  },
  seguimientos: {
    select: {
      seguimiento: { select: { tipoSeguimiento: true, prioridad: true } },
    },
  },
} as const;

type DeportistaRow = Awaited<
  ReturnType<typeof prisma.deportista.findMany<{ select: typeof DEPORTISTA_SELECT }>>
>[number];

/**
 * Cuenta las ausencias (AUSENTE) de cada deportista dentro de la ventana
 * semanal. Devuelve un Map deportistaId -> cantidad.
 */
async function ausenciasPorDeportista(
  now: Date,
  deportistaId?: string,
): Promise<Map<string, number>> {
  const { from, to } = weekWindow(now);
  const grouped = await prisma.asistencia.groupBy({
    by: ['deportistaId'],
    where: {
      estado: 'AUSENTE',
      entrenamiento: { fecha: { gte: from, lte: to } },
      ...(deportistaId ? { deportistaId } : {}),
    },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const g of grouped) map.set(g.deportistaId, g._count._all);
  return map;
}

/**
 * Determina, por deportista, si NO fue citado en ninguna de las últimas 3
 * competencias de su disciplina/categoría (ordenadas por fecha del evento
 * descendente). Si el deportista tiene menos de 3 competencias en su división,
 * se considera `false` (no penaliza): con pocos datos no hay evidencia
 * suficiente de un patrón de no-citación.
 */
async function sinCitacionPorDeportista(
  deportistas: Pick<DeportistaRow, 'id' | 'disciplinaId' | 'categoriaId'>[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();

  // Agrupamos deportistas por (disciplina, categoría) para consultar una vez
  // las convocatorias de cada división en lugar de por atleta.
  const porDivision = new Map<string, string[]>();
  for (const d of deportistas) {
    if (!d.disciplinaId || !d.categoriaId) {
      result.set(d.id, false);
      continue;
    }
    const key = `${d.disciplinaId}::${d.categoriaId}`;
    const arr = porDivision.get(key) ?? [];
    arr.push(d.id);
    porDivision.set(key, arr);
  }

  for (const [key, ids] of porDivision) {
    const [disciplinaId, categoriaId] = key.split('::');
    const ultimas = await prisma.convocatoria.findMany({
      where: { disciplinaId, categoriaId },
      orderBy: { evento: { dia: { fecha: 'desc' } } },
      take: 3,
      select: { convocados: { select: { deportistaId: true } } },
    });

    if (ultimas.length < 3) {
      for (const id of ids) result.set(id, false);
      continue;
    }

    const citadoEnAlguna = new Set<string>();
    for (const conv of ultimas) {
      for (const c of conv.convocados) citadoEnAlguna.add(c.deportistaId);
    }
    for (const id of ids) result.set(id, !citadoEnAlguna.has(id));
  }

  return result;
}

function buildInput(
  d: DeportistaRow,
  ausencias: number,
  sinCitacion: boolean,
): TriageInput {
  return {
    seguimientos: d.seguimientos.map((s) => ({
      tipoSeguimiento: s.seguimiento.tipoSeguimiento,
      prioridad: s.seguimiento.prioridad,
    })),
    estado: d.estado,
    historialLesiones: d.datosSalud?.historialLesiones ?? null,
    obraSocial: d.datosSalud?.obraSocial ?? null,
    dificultadAlimentacion: d.necesidadesApoyo?.dificultadAlimentacion ?? null,
    recibeVianda: d.necesidadesApoyo?.recibeVianda ?? false,
    vivePensionClub: d.vivePensionClub,
    vivePensionExterna: d.vivePensionExterna,
    situacionLaboralHogar: d.datosSociales?.situacionLaboralHogar ?? null,
    trabaja: d.datosSociales?.trabaja ?? null,
    ciudad: d.ciudad,
    nacionalidad: d.nacionalidad,
    padreNacionalidad: d.datosFamiliares?.padreNacionalidad ?? null,
    madreNacionalidad: d.datosFamiliares?.madreNacionalidad ?? null,
    apoyosRequeridos: (d.necesidadesApoyo?.apoyosRequeridos ?? []).map((a) => a.tipo),
    ausenciasSemana: ausencias,
    sinCitacionUltimas3: sinCitacion,
  };
}

export async function getTriageInput(
  deportistaId: string,
  now: Date,
): Promise<TriageInput> {
  const d = await prisma.deportista.findUnique({
    where: { id: deportistaId },
    select: DEPORTISTA_SELECT,
  });
  if (!d) throw new Error('Deportista no encontrado');

  const [ausencias, sinCitacion] = await Promise.all([
    ausenciasPorDeportista(now, deportistaId),
    sinCitacionPorDeportista([d]),
  ]);

  return buildInput(d, ausencias.get(deportistaId) ?? 0, sinCitacion.get(deportistaId) ?? false);
}

export async function getAllTriageInputs(
  now: Date,
): Promise<{ deportistaId: string; input: TriageInput }[]> {
  const deportistas = await prisma.deportista.findMany({ select: DEPORTISTA_SELECT });

  const [ausencias, sinCitacion] = await Promise.all([
    ausenciasPorDeportista(now),
    sinCitacionPorDeportista(deportistas),
  ]);

  return deportistas.map((d) => ({
    deportistaId: d.id,
    input: buildInput(d, ausencias.get(d.id) ?? 0, sinCitacion.get(d.id) ?? false),
  }));
}
