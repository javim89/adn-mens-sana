import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import type { TipoSeguimiento, PrioridadSeguimiento } from '@/lib/types/seguimientos';
import {
  getTipoSeguimientoMeta,
  PRIORIDAD_LABELS,
  PRIORIDAD_STYLES,
} from '@/lib/utils/seguimiento-tipo';

export interface SeguimientoTimelineItem {
  id: string;
  fecha: string; // YYYY-MM-DD
  titulo: string;
  descripcion: string | null;
  prioridad: PrioridadSeguimiento;
  proximaCita: string | null; // ISO datetime o null
  tipoSeguimiento: TipoSeguimiento | null;
}

interface Props {
  seguimientos: SeguimientoTimelineItem[];
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

function formatDatetime(isoStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoStr));
}

export default function SeguimientosTimeline({ seguimientos }: Props) {
  if (seguimientos.length === 0) {
    return (
      <p className="text-sm text-[#6B7280] py-12 text-center">
        Este deportista no tiene seguimientos registrados.
      </p>
    );
  }

  // Ordenar defensivamente por fecha desc (la query ya lo hace)
  const ordenados = [...seguimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <ol className="relative ml-2">
      {/* Línea vertical */}
      <span
        aria-hidden
        className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200"
      />

      {ordenados.map((s) => {
        const tipo = getTipoSeguimientoMeta(s.tipoSeguimiento);
        return (
          <li key={s.id} className="relative pl-8 pb-6 last:pb-0">
            {/* Punto */}
            <span
              aria-hidden
              className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${tipo.dot}`}
            />

            <Link
              href={`/seguimientos/${s.id}`}
              className="block rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-[#121A61]/30 hover:bg-[#F3F4F6]"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs text-[#6B7280] whitespace-nowrap">
                  {formatDate(s.fecha)}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tipo.badge}`}
                >
                  {tipo.label}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORIDAD_STYLES[s.prioridad] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {PRIORIDAD_LABELS[s.prioridad] ?? s.prioridad}
                </span>
              </div>

              <p className="text-sm font-semibold text-[#1C1C1C]">{s.titulo}</p>

              {s.descripcion && (
                <p className="text-sm text-[#6B7280] mt-1 line-clamp-3 whitespace-pre-wrap">
                  {s.descripcion}
                </p>
              )}

              {s.proximaCita && (
                <p className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-2">
                  <CalendarClock size={14} />
                  Próxima cita: {formatDatetime(s.proximaCita)}
                </p>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
