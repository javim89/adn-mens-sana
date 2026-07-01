export type PrioridadSeguimiento = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

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
  profesionalId: string;
  profesionalNombre: string;
  deportistaId: string;
  deportistaNombre: string; // "Apellido, Nombre"
}

export interface Profesional {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}
