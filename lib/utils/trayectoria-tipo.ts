import type { TrayectoriaEventoTipo } from '@/lib/types/trayectoria';

/**
 * Metadatos visuales por tipo de evento de trayectoria.
 * - `label`: etiqueta legible.
 * - `badge`: clases del chip (bg + text).
 * - `dot`: color del punto/línea del timeline.
 *
 * Para eventos SEGUIMIENTO, el color real se resuelve por `tipoSeguimiento`
 * (ver `getTipoSeguimientoMeta` en `seguimiento-tipo.ts`); este mapa sólo
 * define el fallback/label genérico del tipo.
 */
export const TRAYECTORIA_TIPO_META: Record<
  TrayectoriaEventoTipo,
  { label: string; badge: string; dot: string }
> = {
  SEGUIMIENTO: {
    label: 'Seguimiento',
    badge: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
  CONVOCATORIA: {
    label: 'Convocatoria',
    badge: 'bg-indigo-50 text-indigo-700',
    dot: 'bg-indigo-500',
  },
  PRESENTISMO: {
    label: 'Presentismo',
    badge: 'bg-teal-50 text-teal-700',
    dot: 'bg-teal-500',
  },
  TURNO: {
    label: 'Turno',
    badge: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  HISTORIA: {
    label: 'Historia',
    badge: 'bg-slate-100 text-slate-700',
    dot: 'bg-slate-500',
  },
};

/** Devuelve el meta visual de un tipo de evento de trayectoria. */
export function getTrayectoriaTipoMeta(tipo: TrayectoriaEventoTipo) {
  return TRAYECTORIA_TIPO_META[tipo];
}
