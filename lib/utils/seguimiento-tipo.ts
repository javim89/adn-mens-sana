import type { TipoSeguimiento, PrioridadSeguimiento } from '@/lib/types/seguimientos';

/**
 * Metadatos visuales por tipo de seguimiento.
 * - `label`: etiqueta legible.
 * - `badge`: clases del chip (bg + text).
 * - `dot`: color del punto/línea del timeline.
 *
 * El verde queda reservado para los tipos de nutrición (Antropometría).
 */
export const TIPO_SEGUIMIENTO_META: Record<
  TipoSeguimiento,
  { label: string; badge: string; dot: string }
> = {
  GENERICO: {
    label: 'Genérico',
    badge: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
  EVALUACION_PSICOLOGICA: {
    label: 'Evaluación Psicológica',
    badge: 'bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
  },
  EVALUACION_CARDIOLOGICA: {
    label: 'Evaluación Cardiológica',
    badge: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
  TRAUMATOLOGIA: {
    label: 'Traumatología',
    badge: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  HISTORIA_CLINICA: {
    label: 'Historia Clínica',
    badge: 'bg-teal-50 text-teal-700',
    dot: 'bg-teal-500',
  },
  ANTROPOMETRIA: {
    label: 'Antropometría',
    badge: 'bg-green-50 text-green-700',
    dot: 'bg-green-500',
  },
};

/** Devuelve el meta de un tipo, tratando `null`/desconocido como GENERICO. */
export function getTipoSeguimientoMeta(tipo: TipoSeguimiento | null | undefined) {
  if (tipo && tipo in TIPO_SEGUIMIENTO_META) {
    return TIPO_SEGUIMIENTO_META[tipo];
  }
  return TIPO_SEGUIMIENTO_META.GENERICO;
}

export const PRIORIDAD_LABELS: Record<PrioridadSeguimiento, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const PRIORIDAD_STYLES: Record<PrioridadSeguimiento, string> = {
  BAJA: 'bg-emerald-100 text-emerald-800',
  MEDIA: 'bg-yellow-100 text-yellow-900',
  ALTA: 'bg-orange-200 text-orange-900',
  URGENTE: 'bg-red-100 text-red-900',
};
