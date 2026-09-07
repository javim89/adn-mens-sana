import type { NivelTriage } from '@/lib/generated/prisma/enums';
import type { PrioridadSeguimiento, TipoSeguimiento } from '@/lib/types/seguimientos';
import type { EstadoDeportista, SituacionLaboral, DificultadAlimentacion } from '@/lib/generated/prisma/enums';

export type { NivelTriage };

export type AreaTriage =
  | 'MEDICA'
  | 'NUTRICIONAL'
  | 'PSICOLOGICA'
  | 'EDUCACIONAL'
  | 'SOCIAL'
  | 'DEPORTIVA'
  | 'COMPUESTA';

export interface TriageContribucion {
  area: AreaTriage;
  regla: string;
  puntos: number;
}

export interface TriageResult {
  puntajeTotal: number;
  nivel: NivelTriage;
  desglose: TriageContribucion[];
}

export interface TriageSeguimientoInput {
  tipoSeguimiento: TipoSeguimiento | null;
  prioridad: PrioridadSeguimiento;
}

/**
 * Forma plana y pre-computada que consumen las reglas puras. Todos los campos
 * de fecha/ventana ya vienen resueltos aquí para que `computeTriage` no acceda
 * a la DB ni use `new Date()`.
 */
export interface TriageInput {
  seguimientos: TriageSeguimientoInput[];
  estado: EstadoDeportista;
  historialLesiones: string | null;
  obraSocial: string | null;
  dificultadAlimentacion: DificultadAlimentacion | null;
  recibeVianda: boolean;
  vivePensionClub: boolean;
  vivePensionExterna: boolean;
  situacionLaboralHogar: SituacionLaboral | null;
  trabaja: boolean | null;
  ciudad: string | null;
  nacionalidad: string | null;
  padreNacionalidad: string | null;
  madreNacionalidad: string | null;
  apoyosRequeridos: string[];
  ausenciasSemana: number;
  sinCitacionUltimas3: boolean;
}
