'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { EventInput, DayCellContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import CalendarioFiltro from './CalendarioFiltro';
import { utcDateKey } from '@/lib/utils/calendario-date';
import type {
  CalendarioCategoria,
  CalendarioDia,
  CalendarioEvento,
  TipoDia,
} from '@/lib/queries/calendario';

// FullCalendar toca el DOM directamente; lo cargamos solo en cliente para evitar
// cualquier problema de hydration/SSR con React 19 / Next 16.
const FullCalendarClient = dynamic(() => import('@fullcalendar/react'), { ssr: false });

interface CalendarioViewProps {
  categorias: CalendarioCategoria[];
  dias: CalendarioDia[];
  eventos: CalendarioEvento[];
}

const TIPO_DIA_CLASS: Record<TipoDia, string> = {
  TORNEO: 'cal-dia-torneo',
  RECESO: 'cal-dia-receso',
  RECUPERO: 'cal-dia-recupero',
  SIN_ACTIVIDAD: 'cal-dia-sin-actividad',
};

const LEYENDA: { tipo: TipoDia; label: string; swatch: string }[] = [
  { tipo: 'TORNEO', label: 'Torneo', swatch: 'cal-swatch-torneo' },
  { tipo: 'RECESO', label: 'Receso', swatch: 'cal-swatch-receso' },
  { tipo: 'RECUPERO', label: 'Recupero', swatch: 'cal-swatch-recupero' },
  { tipo: 'SIN_ACTIVIDAD', label: 'Sin actividad', swatch: 'cal-swatch-sin-actividad' },
];

export default function CalendarioView({ categorias, dias, eventos }: CalendarioViewProps) {
  const [categoriaId, setCategoriaId] = useState('');

  // Map fecha (YYYY-MM-DD) -> tipo de día, para colorear celdas.
  const diaTipoMap = useMemo(() => {
    const m = new Map<string, TipoDia>();
    for (const d of dias) m.set(d.fecha, d.tipo);
    return m;
  }, [dias]);

  const eventosFiltrados = useMemo(
    () => (categoriaId ? eventos.filter((e) => e.categoriaId === categoriaId) : eventos),
    [eventos, categoriaId],
  );

  const fcEvents: EventInput[] = useMemo(
    () =>
      eventosFiltrados.map((e) => {
        const suspendido = e.estado === 'SUSPENDIDO';
        const reprogramado = e.estado === 'REPROGRAMADO';
        const className = suspendido
          ? 'cal-evento cal-evento-suspendido'
          : reprogramado
            ? 'cal-evento cal-evento-reprogramado'
            : 'cal-evento';
        return {
          id: e.id,
          title: `${e.categoriaNombre} · ${e.local} vs ${e.visitante}`,
          start: e.fecha,
          allDay: true,
          className,
          extendedProps: {
            categoria: e.categoriaNombre,
            grupo: e.grupo,
            local: e.local,
            visitante: e.visitante,
            estado: e.estado,
          },
        };
      }),
    [eventosFiltrados],
  );

  function dayCellClassNames(arg: DayCellContentArg): string[] {
    const tipo = diaTipoMap.get(utcDateKey(arg.date));
    return tipo ? [TIPO_DIA_CLASS[tipo]] : [];
  }

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1
          className="text-3xl font-bold text-[#121A61]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Calendario
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Fixture Torneo Juveniles 2026 — Gimnasia y Esgrima La Plata
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-end sm:justify-between">
        <CalendarioFiltro categorias={categorias} value={categoriaId} onChange={setCategoriaId} />
        <ul className="cal-legend" aria-label="Referencia de colores">
          {LEYENDA.map((l) => (
            <li key={l.tipo} className="cal-legend-item">
              <span className={l.swatch} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-2 sm:p-4 min-w-0 overflow-x-auto">
        <FullCalendarClient
          plugins={[dayGridPlugin, multiMonthPlugin]}
          initialView="dayGridMonth"
          initialDate="2026-03-01"
          locale="es"
          firstDay={1}
          height="auto"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,multiMonthYear',
          }}
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            year: 'Año',
          }}
          views={{
            multiMonthYear: { type: 'multiMonth', duration: { years: 1 } },
          }}
          events={fcEvents}
          dayCellClassNames={dayCellClassNames}
          displayEventTime={false}
          dayMaxEvents={3}
          fixedWeekCount={false}
        />
      </div>
    </div>
  );
}
