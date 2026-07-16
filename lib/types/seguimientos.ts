export type PrioridadSeguimiento = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export type TipoSeguimiento =
  | 'GENERICO'
  | 'TRAUMATOLOGIA'
  | 'HISTORIA_CLINICA'
  | 'EVALUACION_PSICOLOGICA'
  | 'EVALUACION_CARDIOLOGICA';

// ---------------------------------------------------------------------------
// Satellite data shapes
// ---------------------------------------------------------------------------

export interface TraumatologiaData {
  estabilidadHombro?: string;
  estabilidadRodilla?: string;
  estabilidadTobillo?: string;
  movilidadHombro?: string;
  movilidadCadera?: string;
  movilidadRodilla?: string;
  movilidadTobillo?: string;
  discrepanciaAsimetria?: string;
  postura?: string;
  laxitud?: string;
  podoscopia?: string;
  observaciones?: string;
}

export interface HistoriaClinicaData {
  tensionArterial?: string;
  auscultacionPulmonar?: string;
  avOjoDerecho?: string;
  avOjoIzquierdo?: string;
  diagnostico?: string;
}

export interface EvaluacionPsicologicaData {
  cprdControlEstres?: number;
  cprdInfluenciaEvaluacion?: number;
  cprdMotivacion?: number;
  cprdHabilidadMental?: number;
  cprdCohesionEquipo?: number;
  sociograma?: string;
  poms?: string;
  staiRasgo?: number;
  staiEstado?: number;
  observaciones?: string;
}

export interface EvaluacionCardiologicaData {
  ecg?: string;
  examenFisico?: string;
  sintomas?: string;
  estudiosAnteriores?: string;
  diagnostico?: string;
  observaciones?: string;
}

export type DatosEspecificosSeguimiento =
  | { tipo: 'TRAUMATOLOGIA'; datos: TraumatologiaData }
  | { tipo: 'HISTORIA_CLINICA'; datos: HistoriaClinicaData }
  | { tipo: 'EVALUACION_PSICOLOGICA'; datos: EvaluacionPsicologicaData }
  | { tipo: 'EVALUACION_CARDIOLOGICA'; datos: EvaluacionCardiologicaData }
  | { tipo: 'GENERICO'; datos: Record<string, never> };

// ---------------------------------------------------------------------------
// Form & list types
// ---------------------------------------------------------------------------

export interface SeguimientoFormData {
  deportistaId: string;
  profesionalId: string; // solo relevante si admin; si no, el backend usa userId
  fecha: string; // ISO date string YYYY-MM-DD
  titulo: string;
  descripcion?: string;
  recomendaciones?: string;
  resultadosEvaluacion?: string;
  prioridad: PrioridadSeguimiento;
  proximaCita?: string; // ISO datetime-local string, puede ser vacío
  alertaSeguimiento?: string;
  tipoSeguimiento?: TipoSeguimiento;
  datosEspecificos?: DatosEspecificosSeguimiento;
}

export interface DeportistaOption {
  id: string;
  nombre: string;
  apellido: string;
}

export interface SeguimientoListItem {
  id: string;
  fecha: string; // YYYY-MM-DD
  titulo: string;
  descripcion: string | null;
  recomendaciones: string | null;
  resultadosEvaluacion: string | null;
  prioridad: PrioridadSeguimiento;
  proximaCita: string | null; // ISO string o null
  alertaSeguimiento: string | null;
  tipoSeguimiento: TipoSeguimiento | null;
  profesionalId: string;
  profesionalNombre: string;
  deportistaId: string;
  deportistaNombre: string; // "Apellido, Nombre"
}

export interface SeguimientoDetalle extends SeguimientoListItem {
  traumatologia: TraumatologiaData | null;
  historiaClinica: HistoriaClinicaData | null;
  evaluacionPsicologica: EvaluacionPsicologicaData | null;
  evaluacionCardiologica: EvaluacionCardiologicaData | null;
}

export interface Profesional {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}
