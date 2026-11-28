'use client';

import { useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventInput, DayCellContentArg } from '@fullcalendar/core';
import { Button } from '@/app/components/ui/button';
import { EncabezadoPagina } from '@/app/components/ui/encabezado-pagina';
import { FiltroChip } from '@/app/components/ui/filtro-chip';
import { LayoutConLateral } from '@/app/components/ui/layout-con-lateral';
import { Panel } from '@/app/components/ui/panel';
import { cn } from '@/lib/utils';
import { utcDateKey } from '@/lib/utils/calendario-date';
import { TIPO_DIA_LABELS } from '@/lib/utils/enum-labels';
import type {
  CalendarioCategoria,
  CalendarioDia,
  CalendarioEvento,
  TipoDia,
} from '@/lib/queries/calendario';
import type { VistaCalendario } from './FullCalendarControlado';

// FullCalendar toca el DOM directamente; lo cargamos solo en cliente para evitar
// cualquier problema de hydration/SSR con React 19 / Next 16.
const FullCalendarClient = dynamic(() => import('./FullCalendarControlado'), { ssr: false });

interface CalendarioViewProps {
  categorias: CalendarioCategoria[];
  dias: CalendarioDia[];
  eventos: CalendarioEvento[];
  /** `'YYYY-MM-DD'` de hoy en la zona del club: el calendario abre en este mes. */
  hoy: string;
  /** Categoría elegida en la URL (`?categoria=`), ya validada por la página. */
  categoriaId?: string | null;
  /** Columna derecha (próximos partidos), renderizada en el servidor. */
  lateral?: ReactNode;
}

const TIPO_DIA_CLASS: Record<TipoDia, string> = {
  TORNEO: 'cal-dia-torneo',
  RECESO: 'cal-dia-receso',
  RECUPERO: 'cal-dia-recupero',
  SIN_ACTIVIDAD: 'cal-dia-sin-actividad',
};

const LEYENDA: { tipo: TipoDia; swatch: string }[] = [
  { tipo: 'TORNEO', swatch: 'cal-swatch-torneo' },
  { tipo: 'RECESO', swatch: 'cal-swatch-receso' },
  { tipo: 'RECUPERO', swatch: 'cal-swatch-recupero' },
  { tipo: 'SIN_ACTIVIDAD', swatch: 'cal-swatch-sin-actividad' },
];

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const VISTAS: { id: VistaCalendario; label: string }[] = [
  { id: 'dayGridMonth', label: 'Mes' },
  { id: 'multiMonthYear', label: 'Año' },
];

const pad = (n: number) => String(n).padStart(2, '0');

export default function CalendarioView({
  categorias,
  dias,
  eventos,
  hoy,
  categoriaId: categoriaInicial = null,
  lateral,
}: CalendarioViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [categoriaId, setCategoriaId] = useState<string | null>(categoriaInicial);
  const [vista, setVista] = useState<VistaCalendario>('dayGridMonth');
  const [periodo, setPeriodo] = useState(() => {
    const [anio, mes] = hoy.split('-').map(Number);
    return { anio, mes: mes - 1 };
  });

  const esMes = vista === 'dayGridMonth';
  const fecha = esMes ? `${periodo.anio}-${pad(periodo.mes + 1)}-01` : `${periodo.anio}-01-01`;
  const titulo = esMes ? `${MESES[periodo.mes]} ${periodo.anio}` : String(periodo.anio);

  function mover(paso: 1 | -1) {
    setPeriodo(({ anio, mes }) => {
      if (!esMes) return { anio: anio + paso, mes };
      const total = anio * 12 + mes + paso;
      return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
    });
  }

  function irAHoy() {
    const [anio, mes] = hoy.split('-').map(Number);
    setPeriodo({ anio, mes: mes - 1 });
  }

  function cambiarCategoria(id: string | null) {
    setCategoriaId(id);
    const qs = id ? `?${new URLSearchParams({ categoria: id })}` : '';
    // La columna de próximos partidos se filtra en el servidor: hay que refrescar la ruta.
    router.replace(`${pathname}${qs}`, { scroll: false });
  }

  // Map fecha (YYYY-MM-DD) -> tipo de día, para colorear celdas.
  const diaTipoMap = useMemo(() => {
    const m = new Map<string, TipoDia>();
    for (const d of dias) m.set(d.fecha, d.tipo);
    return m;
  }, [dias]);

  const fcEvents: EventInput[] = useMemo(
    () =>
      (categoriaId ? eventos.filter((e) => e.categoriaId === categoriaId) : eventos).map((e) => {
        const className =
          e.estado === 'SUSPENDIDO'
            ? 'cal-evento cal-evento-suspendido'
            : e.estado === 'REPROGRAMADO'
              ? 'cal-evento cal-evento-reprogramado'
              : 'cal-evento';
        return {
          id: e.id,
          title: `${e.categoriaNombre} · ${e.rival ?? `${e.local} vs ${e.visitante}`}`,
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
    [eventos, categoriaId],
  );

  function dayCellClassNames(arg: DayCellContentArg): string[] {
    const tipo = diaTipoMap.get(utcDateKey(arg.date));
    return tipo ? [TIPO_DIA_CLASS[tipo]] : [];
  }

  const calendario = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button size="icon" className="size-8" onClick={() => mover(-1)} aria-label={esMes ? 'Mes anterior' : 'Año anterior'}>
            <ChevronLeft aria-hidden />
          </Button>
          <Button size="icon" className="size-8" onClick={() => mover(1)} aria-label={esMes ? 'Mes siguiente' : 'Año siguiente'}>
            <ChevronRight aria-hidden />
          </Button>
          <p
            aria-live="polite"
            className="min-w-0 truncate font-[family-name:var(--font-oswald)] text-lg font-semibold text-primario md:text-xl"
          >
            {titulo}
          </p>
          <Button variant="outline" size="sm" onClick={irAHoy}>
            Hoy
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FiltroChip
            label="Categoría"
            todosLabel="Todas las categorías"
            opciones={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
            valor={categoriaId}
            onChange={cambiarCategoria}
            align="end"
          />
          <div role="group" aria-label="Vista" className="flex overflow-hidden rounded-lg border border-border text-xs font-medium">
            {VISTAS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={vista === v.id}
                onClick={() => setVista(v.id)}
                className={cn(
                  'h-8 px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  vista === v.id
                    ? 'border-b-2 border-acento bg-primario text-white'
                    : 'bg-background text-foreground hover:bg-muted',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul className="cal-legend" aria-label="Referencia de colores">
        {LEYENDA.map((l) => (
          <li key={l.tipo} className="cal-legend-item">
            <span className={l.swatch} aria-hidden="true" />
            {TIPO_DIA_LABELS[l.tipo]}
          </li>
        ))}
      </ul>

      <Panel relleno={false} className="overflow-hidden p-1 sm:p-3">
        <FullCalendarClient
          vista={vista}
          fecha={fecha}
          events={fcEvents}
          dayCellClassNames={dayCellClassNames}
        />
      </Panel>
    </>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <EncabezadoPagina
        titulo={`Temporada ${periodo.anio}`}
        subtitulo="Fixture, días de torneo y partidos de cada categoría."
      />
      {lateral ? (
        <LayoutConLateral lateral={lateral} lateralLabel="Próximos partidos">
          {calendario}
        </LayoutConLateral>
      ) : (
        <div className="flex min-w-0 flex-col gap-4">{calendario}</div>
      )}
    </div>
  );
}
