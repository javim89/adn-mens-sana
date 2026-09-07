import type { NivelTriage } from '@/lib/generated/prisma/enums';
import type {
  AreaTriage,
  TriageContribucion,
  TriageInput,
  TriageResult,
  TriageSeguimientoInput,
} from '@/lib/types/triage';
import type { PrioridadSeguimiento, TipoSeguimiento } from '@/lib/types/seguimientos';

// Mapeo de tipoSeguimiento -> área. GENERICO y null quedan fuera (sin área).
const TIPO_TO_AREA: Partial<Record<TipoSeguimiento, AreaTriage>> = {
  TRAUMATOLOGIA: 'MEDICA',
  HISTORIA_CLINICA: 'MEDICA',
  EVALUACION_CARDIOLOGICA: 'MEDICA',
  EVALUACION_PSICOLOGICA: 'PSICOLOGICA',
  ANTROPOMETRIA: 'NUTRICIONAL',
};

function areaDeSeguimiento(s: TriageSeguimientoInput): AreaTriage | null {
  if (!s.tipoSeguimiento) return null;
  return TIPO_TO_AREA[s.tipoSeguimiento] ?? null;
}

function normalizar(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function nivelDesdePuntaje(total: number): NivelTriage {
  if (total <= 0) return 'VERDE';
  if (total <= 3) return 'AMARILLO';
  if (total <= 5) return 'NARANJA';
  return 'ROJO';
}

export function computeTriage(input: TriageInput): TriageResult {
  const desglose: TriageContribucion[] = [];
  const push = (area: AreaTriage, regla: string, puntos: number) => {
    if (puntos !== 0) desglose.push({ area, regla, puntos });
  };

  const conArea = input.seguimientos.map((s) => ({
    ...s,
    area: areaDeSeguimiento(s),
  }));

  const isAltaOUrgente = (p: PrioridadSeguimiento) => p === 'ALTA' || p === 'URGENTE';

  // --- Médica ------------------------------------------------------------
  const medicos = conArea.filter((s) => s.area === 'MEDICA');
  if (medicos.some((s) => s.prioridad === 'URGENTE')) {
    push('MEDICA', 'Seguimiento médico URGENTE', 3);
  }
  const medicosAlta = medicos.filter((s) => s.prioridad === 'ALTA').length;
  if (medicosAlta >= 2) push('MEDICA', 'Dos o más seguimientos médicos de prioridad ALTA', 2);
  else if (medicosAlta === 1) push('MEDICA', 'Un seguimiento médico de prioridad ALTA', 1);

  if (input.estado === 'LESIONADO') push('MEDICA', 'Deportista lesionado', 2);
  if (input.historialLesiones && input.historialLesiones.trim().length > 0) {
    push('MEDICA', 'Historial de lesiones', 1);
  }
  if (!input.obraSocial || input.obraSocial.trim().length === 0) {
    push('MEDICA', 'Sin obra social', 1);
  }

  // --- Nutricional -------------------------------------------------------
  const antropometrias = conArea.filter((s) => s.tipoSeguimiento === 'ANTROPOMETRIA');
  if (antropometrias.some((s) => isAltaOUrgente(s.prioridad))) {
    push('NUTRICIONAL', 'Antropometría de prioridad ALTA/URGENTE', 2);
  } else if (antropometrias.some((s) => s.prioridad === 'BAJA' || s.prioridad === 'MEDIA')) {
    push('NUTRICIONAL', 'Antropometría de prioridad BAJA/MEDIA', 1);
  }

  // --- Psicológica (checks independientes, pueden acumularse) -------------
  const psicologicos = conArea.filter((s) => s.tipoSeguimiento === 'EVALUACION_PSICOLOGICA');
  if (psicologicos.some((s) => s.prioridad === 'URGENTE')) {
    push('PSICOLOGICA', 'Evaluación psicológica URGENTE', 3);
  }
  if (psicologicos.some((s) => s.prioridad === 'ALTA')) {
    push('PSICOLOGICA', 'Evaluación psicológica de prioridad ALTA', 2);
  }

  // --- Educacional -------------------------------------------------------
  if (
    input.dificultadAlimentacion === 'A_VECES' ||
    input.dificultadAlimentacion === 'FRECUENTEMENTE'
  ) {
    push('EDUCACIONAL', 'Dificultad de alimentación', 1);
  }
  if (input.recibeVianda === true) push('EDUCACIONAL', 'Recibe vianda', 1);

  // --- Social ------------------------------------------------------------
  if (input.vivePensionClub || input.vivePensionExterna) {
    push('SOCIAL', 'Vive en pensión', 2);
  }
  if (input.situacionLaboralHogar === 'NADIE_TRABAJA') {
    push('SOCIAL', 'Nadie trabaja en el hogar', 2);
  } else if (input.situacionLaboralHogar === 'ALGUIEN_TRABAJA') {
    push('SOCIAL', 'Solo alguien trabaja en el hogar', 1);
  }
  if (input.trabaja === true) push('SOCIAL', 'El deportista trabaja', 1);

  const ciudad = normalizar(input.ciudad);
  if (ciudad && ciudad !== 'la plata') push('SOCIAL', 'Reside fuera de La Plata', 1);

  const nacionalidad = normalizar(input.nacionalidad);
  if (nacionalidad && nacionalidad !== 'argentina') {
    push('SOCIAL', 'Nacionalidad no argentina', 1);
  }

  const padreNac = normalizar(input.padreNacionalidad);
  const madreNac = normalizar(input.madreNacionalidad);
  if ((padreNac && padreNac !== 'argentina') || (madreNac && madreNac !== 'argentina')) {
    push('SOCIAL', 'Padre o madre de nacionalidad no argentina', 1);
  }

  if (input.apoyosRequeridos.some((a) => a !== 'NINGUNO')) {
    push('SOCIAL', 'Requiere apoyos', 1);
  }

  // --- Deportiva ---------------------------------------------------------
  if (input.ausenciasSemana >= 2) push('DEPORTIVA', 'Dos o más ausencias en la semana', 2);
  else if (input.ausenciasSemana === 1) push('DEPORTIVA', 'Una ausencia en la semana', 1);

  if (input.sinCitacionUltimas3 === true) {
    push('DEPORTIVA', 'Sin citación en las últimas 3 competencias', 2);
  }

  // --- Compuesta (multi-área) --------------------------------------------
  const areasCriticas = new Set<AreaTriage>();
  for (const s of conArea) {
    if (s.area && isAltaOUrgente(s.prioridad)) {
      if (s.area === 'MEDICA' || s.area === 'PSICOLOGICA' || s.area === 'NUTRICIONAL') {
        areasCriticas.add(s.area);
      }
    }
  }
  if (areasCriticas.size >= 3) {
    push('COMPUESTA', 'Tres áreas críticas (médica, psicológica y nutricional)', 2);
  } else if (areasCriticas.size === 2) {
    push('COMPUESTA', 'Dos áreas críticas', 1);
  }

  const puntajeTotal = desglose.reduce((acc, c) => acc + c.puntos, 0);

  return {
    puntajeTotal,
    nivel: nivelDesdePuntaje(puntajeTotal),
    desglose,
  };
}
